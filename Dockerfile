FROM node:23 AS builder

WORKDIR /workspace

RUN  npm install -g @vscode/vsce 

COPY . .

RUN cd extension && vsce package

FROM scratch AS export-stage

COPY --from=builder /workspace/extension/go-0.46.0-dev.vsix /out/
