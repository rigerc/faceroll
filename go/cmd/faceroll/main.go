package main

import (
	"os"

	"github.com/rigerc/faceroll/go/internal/cli"
)

func main() {
	os.Exit(cli.Run(os.Args[1:], os.Stdout, os.Stderr))
}
