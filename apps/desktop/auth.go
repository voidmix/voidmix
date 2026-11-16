package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/egoist/mygo"
	"github.com/zalando/go-keyring"
)

const desktopClientID = "voidmix-desktop"
const keyringService = "com.voidmix.app"

type NativeUser struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type LoginAttempt struct {
	ID       string `json:"id"`
	UserCode string `json:"userCode"`
	Interval int    `json:"interval"`
}

type LoginResult struct {
	Pending  bool        `json:"pending"`
	Interval int         `json:"interval"`
	User     *NativeUser `json:"user"`
}

type secretStore interface {
	Get(string, string) (string, error)
	Set(string, string, string) error
	Delete(string, string) error
}

type systemKeyring struct{}

func (systemKeyring) Get(service, account string) (string, error) {
	return keyring.Get(service, account)
}
func (systemKeyring) Set(service, account, token string) error {
	return keyring.Set(service, account, token)
}
func (systemKeyring) Delete(service, account string) error { return keyring.Delete(service, account) }

type deviceAttempt struct {
	id, origin, code  string
	interval          int
	expires, nextPoll time.Time
	polling           bool
	ctx               context.Context
	cancel            context.CancelFunc
	closeWindow       func()
}

// NativeAuth owns desktop sessions; tokens never cross the JavaScript bridge.
type NativeAuth struct {
	mu         sync.Mutex
	client     *http.Client
	store      secretStore
	attempt    *deviceAttempt
	openWindow func(string, func()) func()
}

func newNativeAuth() *NativeAuth {
	return &NativeAuth{
		client: &http.Client{Timeout: 15 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }},
		store:  systemKeyring{},
		openWindow: func(target string, onClose func()) func() {
			window := mygo.NewWindow(mygo.WindowOptions{
				Title: "登录 Voidmix", URL: target, Width: 480, Height: 760, MinWidth: 360, MinHeight: 480,
				Page: mygo.PageOptions{Untrusted: true},
			})
			window.OnClosed(func() { go onClose() })
			return window.Close
		},
	}
}

func apiOrigin(raw string) (string, error) {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Host == "" || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" || (parsed.Path != "" && parsed.Path != "/") {
		return "", errors.New("API 地址必须是完整的服务来源地址。")
	}
	if parsed.Scheme != "https" && !(parsed.Scheme == "http" && (parsed.Hostname() == "localhost" || parsed.Hostname() == "127.0.0.1" || parsed.Hostname() == "::1")) {
		return "", errors.New("API 必须使用 HTTPS；本机开发可使用 HTTP。")
	}
	return parsed.Scheme + "://" + parsed.Host, nil
}

func keyringAccount(origin string) string {
	// Separate environments without exposing origin strings in keyring account names.
	hash := sha256.Sum256([]byte(origin))
	return hex.EncodeToString(hash[:])
}

func (a *NativeAuth) request(ctx context.Context, origin, path, token string, body any, out any) (int, error) {
	method := http.MethodGet
	var payload bytes.Buffer
	if body != nil {
		method = http.MethodPost
		if err := json.NewEncoder(&payload).Encode(body); err != nil {
			return 0, err
		}
	}
	req, err := http.NewRequestWithContext(ctx, method, origin+"/api/auth"+path, &payload)
	if err != nil {
		return 0, err
	}
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	response, err := a.client.Do(req)
	if err != nil {
		return 0, errors.New("无法连接登录服务，请检查网络后重试。")
	}
	defer response.Body.Close()
	if out != nil {
		if err := json.NewDecoder(http.MaxBytesReader(nil, response.Body, 1<<20)).Decode(out); err != nil {
			return response.StatusCode, errors.New("登录服务返回了无效响应。")
		}
	}
	return response.StatusCode, nil
}

func (a *NativeAuth) cancel(id string) {
	a.mu.Lock()
	attempt := a.attempt
	if attempt == nil || (id != "" && attempt.id != id) {
		a.mu.Unlock()
		return
	}
	a.attempt = nil
	attempt.cancel()
	a.mu.Unlock()
	if attempt.closeWindow != nil {
		attempt.closeWindow()
	}
}

// CancelLogin closes this login window without changing an existing session.
func (a *NativeAuth) CancelLogin(id string) { a.cancel(id) }

// StartLogin opens an isolated WebView with no native bindings.
func (a *NativeAuth) StartLogin(rawOrigin string) (*LoginAttempt, error) {
	origin, err := apiOrigin(rawOrigin)
	if err != nil {
		return nil, err
	}
	a.cancel("")
	var grant struct {
		DeviceCode      string `json:"device_code"`
		UserCode        string `json:"user_code"`
		VerificationURI string `json:"verification_uri_complete"`
		ExpiresIn       int    `json:"expires_in"`
		Interval        int    `json:"interval"`
	}
	status, err := a.request(context.Background(), origin, "/device/code", "", map[string]string{"client_id": desktopClientID}, &grant)
	if err != nil {
		return nil, err
	}
	if status != http.StatusOK || grant.DeviceCode == "" || grant.UserCode == "" || grant.ExpiresIn <= 0 {
		return nil, errors.New("暂时无法发起登录，请稍后重试。")
	}
	verification, err := url.Parse(grant.VerificationURI)
	if err != nil || verification.User != nil {
		return nil, errors.New("登录页面地址无效。")
	}
	if _, err := apiOrigin(verification.Scheme + "://" + verification.Host); err != nil {
		return nil, err
	}
	if grant.Interval < 1 {
		grant.Interval = 5
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(grant.ExpiresIn)*time.Second)
	id := rand.Text()
	attempt := &deviceAttempt{id: id, origin: origin, code: grant.DeviceCode, interval: grant.Interval, expires: time.Now().Add(time.Duration(grant.ExpiresIn) * time.Second), ctx: ctx, cancel: cancel}
	a.mu.Lock()
	a.attempt = attempt
	a.mu.Unlock()
	closeWindow := a.openWindow(grant.VerificationURI, func() { a.cancel(id) })
	a.mu.Lock()
	active := a.attempt == attempt
	if active {
		attempt.closeWindow = closeWindow
	}
	a.mu.Unlock()
	if !active {
		closeWindow()
		return nil, errors.New("登录已取消。")
	}
	return &LoginAttempt{ID: id, UserCode: grant.UserCode, Interval: grant.Interval}, nil
}

func (a *NativeAuth) user(ctx context.Context, origin, token string) (*NativeUser, error) {
	var session *struct {
		User NativeUser `json:"user"`
	}
	status, err := a.request(ctx, origin, "/get-session", token, nil, &session)
	if err != nil {
		return nil, err
	}
	if status == http.StatusUnauthorized || (status == http.StatusOK && session == nil) {
		return nil, nil
	}
	if status != http.StatusOK || session.User.ID == "" {
		return nil, errors.New("无法读取登录状态，请重试。")
	}
	return &session.User, nil
}

// PollLogin redeems the device grant in Go and returns only the user's profile.
func (a *NativeAuth) PollLogin(id string) (*LoginResult, error) {
	a.mu.Lock()
	attempt := a.attempt
	if attempt == nil || attempt.id != id {
		a.mu.Unlock()
		return nil, errors.New("登录窗口已关闭，请重新登录。")
	}
	if time.Now().After(attempt.expires) {
		a.mu.Unlock()
		a.cancel(id)
		return nil, errors.New("授权已过期，请重新登录。")
	}
	if attempt.polling || time.Now().Before(attempt.nextPoll) {
		interval := attempt.interval
		a.mu.Unlock()
		return &LoginResult{Pending: true, Interval: interval}, nil
	}
	attempt.polling = true
	attempt.nextPoll = time.Now().Add(time.Duration(attempt.interval) * time.Second)
	a.mu.Unlock()
	defer func() { a.mu.Lock(); attempt.polling = false; a.mu.Unlock() }()
	var result struct {
		Token string `json:"access_token"`
		Error string `json:"error"`
	}
	status, err := a.request(attempt.ctx, attempt.origin, "/device/token", "", map[string]string{
		"client_id": desktopClientID, "device_code": attempt.code, "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
	}, &result)
	if err != nil {
		a.cancel(id)
		return nil, err
	}
	if result.Error == "authorization_pending" || result.Error == "slow_down" {
		a.mu.Lock()
		if result.Error == "slow_down" {
			attempt.interval += 5
			attempt.nextPoll = time.Now().Add(time.Duration(attempt.interval) * time.Second)
		}
		interval := attempt.interval
		a.mu.Unlock()
		return &LoginResult{Pending: true, Interval: interval}, nil
	}
	if status != http.StatusOK || result.Token == "" {
		a.cancel(id)
		if result.Error == "access_denied" {
			return nil, errors.New("本次登录未获授权。")
		}
		return nil, errors.New("授权已失效，请重新登录。")
	}
	user, err := a.user(attempt.ctx, attempt.origin, result.Token)
	a.mu.Lock()
	active := a.attempt == attempt && attempt.ctx.Err() == nil
	// A cancelled or superseded attempt must never install a session into the keyring.
	if err == nil && user != nil && active {
		err = a.store.Set(keyringService, keyringAccount(attempt.origin), result.Token)
	}
	if err == nil && user != nil && active {
		a.attempt = nil
	}
	a.mu.Unlock()
	if err != nil || user == nil || !active {
		// Redemption already created a server session: revoke it if local commit fails.
		_, _ = a.request(context.Background(), attempt.origin, "/sign-out", result.Token, map[string]string{}, nil)
		a.cancel(id)
		if err != nil {
			return nil, errors.New("无法安全保存会话，请检查系统钥匙串和网络后重试。")
		}
		return nil, errors.New("登录已取消或会话已失效，请重试。")
	}
	attempt.cancel()
	if attempt.closeWindow != nil {
		attempt.closeWindow()
	}
	return &LoginResult{User: user}, nil
}

// Session restores this environment's session from the system keyring.
func (a *NativeAuth) Session(rawOrigin string) (*NativeUser, error) {
	origin, err := apiOrigin(rawOrigin)
	if err != nil {
		return nil, err
	}
	token, err := a.store.Get(keyringService, keyringAccount(origin))
	if errors.Is(err, keyring.ErrNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, errors.New("无法读取系统钥匙串，请重试。")
	}
	user, err := a.user(context.Background(), origin, token)
	if err == nil && user == nil {
		err = a.store.Delete(keyringService, keyringAccount(origin))
	}
	return user, err
}

// SignOut revokes the server session before removing its stored credential.
func (a *NativeAuth) SignOut(rawOrigin string) error {
	origin, err := apiOrigin(rawOrigin)
	if err != nil {
		return err
	}
	token, err := a.store.Get(keyringService, keyringAccount(origin))
	if errors.Is(err, keyring.ErrNotFound) {
		return nil
	}
	if err != nil {
		return errors.New("无法读取系统钥匙串，请重试。")
	}
	status, err := a.request(context.Background(), origin, "/sign-out", token, map[string]string{}, nil)
	if err != nil {
		return err
	}
	if status != http.StatusOK && status != http.StatusUnauthorized {
		return fmt.Errorf("退出失败（%d），请重试。", status)
	}
	if err := a.store.Delete(keyringService, keyringAccount(origin)); err != nil && !errors.Is(err, keyring.ErrNotFound) {
		return errors.New("会话已退出，但清理钥匙串失败，请重试。")
	}
	return nil
}
