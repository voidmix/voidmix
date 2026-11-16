package main

import (
	"fmt"
	"log"
	"strings"

	"github.com/egoist/mygo"
)

// Greeter exposes a minimal native service to the frontend.
type Greeter struct{}

// Greet returns a greeting from the Go backend.
func (Greeter) Greet(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		name = "Voidmix"
	}
	return fmt.Sprintf("你好，%s！这条消息来自 Go。", name)
}

func main() {
	mygo.Bind(Greeter{})
	mygo.Bind(newNativeAuth())
	mygo.App.WhenReady(func() {
		mygo.NewWindow(mygo.WindowOptions{
			Title:     "Voidmix",
			Width:     1024,
			Height:    720,
			MinWidth:  480,
			MinHeight: 360,
			// Matches the default light page background before the WebView paints.
			BackgroundColor: "#f7f7f5",
			StateKey:        "main",
			URL:             "/",
		})
	})
	if err := mygo.App.Run(); err != nil {
		log.Fatal(err)
	}
}
