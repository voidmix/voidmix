package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/zalando/go-keyring"
)

type memorySecrets struct {
	token string
	fail  bool
}

func (s *memorySecrets) Get(string, string) (string, error) {
	if s.token == "" {
		return "", keyring.ErrNotFound
	}
	return s.token, nil
}
func (s *memorySecrets) Set(_ string, _ string, token string) error {
	if s.fail {
		return errors.New("keyring unavailable")
	}
	s.token = token
	return nil
}
func (s *memorySecrets) Delete(string, string) error { s.token = ""; return nil }

func authFixture(t *testing.T) (*NativeAuth, *memorySecrets, string, *atomic.Bool, *atomic.Bool) {
	t.Helper()
	var approved, revoked atomic.Bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/api/auth/device/code":
			var body map[string]string
			_ = json.NewDecoder(r.Body).Decode(&body)
			if body["client_id"] != desktopClientID {
				t.Error("wrong client")
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"device_code": "private-device-code", "user_code": "ABCD-EFGH", "verification_uri_complete": "https://app.example.com/authorize?user_code=ABCD-EFGH", "expires_in": 600, "interval": 5})
		case "/api/auth/device/token":
			if approved.Load() {
				_, _ = w.Write([]byte(`{"access_token":"private-session-token"}`))
			} else {
				w.WriteHeader(400)
				_, _ = w.Write([]byte(`{"error":"authorization_pending"}`))
			}
		case "/api/auth/get-session":
			if r.Header.Get("Authorization") != "Bearer private-session-token" || revoked.Load() {
				_, _ = w.Write([]byte(`null`))
				return
			}
			_, _ = w.Write([]byte(`{"user":{"id":"user-1","name":"Tester","email":"tester@example.com"}}`))
		case "/api/auth/sign-out":
			if r.Header.Get("Authorization") != "Bearer private-session-token" {
				t.Error("missing bearer credential")
			}
			revoked.Store(true)
			_, _ = w.Write([]byte(`{"success":true}`))
		default:
			t.Errorf("unexpected route %s", r.URL.Path)
			w.WriteHeader(404)
		}
	}))
	t.Cleanup(server.Close)
	store := &memorySecrets{}
	auth := newNativeAuth()
	auth.store = store
	auth.openWindow = func(target string, _ func()) func() {
		if strings.Contains(target, "private-") {
			t.Error("secret in login URL")
		}
		return func() {}
	}
	return auth, store, server.URL, &approved, &revoked
}

func TestDeviceLoginStoresOnlyInKeyring(t *testing.T) {
	auth, store, origin, approved, revoked := authFixture(t)
	grant, err := auth.StartLogin(origin)
	if err != nil {
		t.Fatal(err)
	}
	encoded, _ := json.Marshal(grant)
	if strings.Contains(string(encoded), "private-") {
		t.Fatal("device secret escaped bridge")
	}
	pending, err := auth.PollLogin(grant.ID)
	if err != nil || !pending.Pending {
		t.Fatalf("expected pending: %v", err)
	}
	approved.Store(true)
	auth.mu.Lock()
	auth.attempt.nextPoll = time.Time{}
	auth.mu.Unlock()
	result, err := auth.PollLogin(grant.ID)
	if err != nil || result.User == nil || result.User.ID != "user-1" {
		t.Fatalf("login failed: %v", err)
	}
	encoded, _ = json.Marshal(result)
	if strings.Contains(string(encoded), "private-") {
		t.Fatal("session token escaped bridge")
	}
	if store.token != "private-session-token" {
		t.Fatal("credential not persisted")
	}
	user, err := auth.Session(origin)
	if err != nil || user == nil {
		t.Fatalf("restore failed: %v", err)
	}
	if err := auth.SignOut(origin); err != nil {
		t.Fatal(err)
	}
	if !revoked.Load() || store.token != "" {
		t.Fatal("logout did not revoke and clear")
	}
}

func TestCanceledGrantCannotEstablishSession(t *testing.T) {
	auth, store, origin, approved, _ := authFixture(t)
	grant, err := auth.StartLogin(origin)
	if err != nil {
		t.Fatal(err)
	}
	auth.CancelLogin(grant.ID)
	approved.Store(true)
	if _, err := auth.PollLogin(grant.ID); err == nil {
		t.Fatal("canceled grant accepted")
	}
	if store.token != "" {
		t.Fatal("canceled session persisted")
	}
}

func TestKeyringFailureRevokesNewSession(t *testing.T) {
	auth, store, origin, approved, revoked := authFixture(t)
	store.fail = true
	grant, err := auth.StartLogin(origin)
	if err != nil {
		t.Fatal(err)
	}
	approved.Store(true)
	if _, err := auth.PollLogin(grant.ID); err == nil {
		t.Fatal("keyring error hidden")
	}
	if !revoked.Load() || store.token != "" {
		t.Fatal("failed session was retained")
	}
}

func TestOriginValidationAndCredentialIsolation(t *testing.T) {
	for _, origin := range []string{"http://api.example.com", "https://user:password@api.example.com", "https://api.example.com/path", "https://api.example.com?token=secret", "file:///tmp/auth"} {
		if _, err := apiOrigin(origin); err == nil {
			t.Errorf("accepted invalid origin %s", origin)
		}
	}
	for _, origin := range []string{"https://api.example.com", "http://127.0.0.1:3002", "http://[::1]:3002"} {
		if _, err := apiOrigin(origin); err != nil {
			t.Error(err)
		}
	}
	if keyringAccount("https://one.example.com") == keyringAccount("https://two.example.com") {
		t.Fatal("credentials shared across environments")
	}
}
