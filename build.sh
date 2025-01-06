#!/bin/bash

docker build --network=host -t vscode-go:$(date +%y-%m-%d-%H-%M-%S)  --output . -f Dockerfile .
