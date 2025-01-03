/*---------------------------------------------------------
 * Copyright 2022 The Go Authors. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------*/

import vscode = require('vscode');
import { ImplementationRequest } from 'vscode-languageserver-protocol';
import { GoExtensionContext } from './context';
import { getGoConfig } from './config';
import * as glob from './common/glob.js';



export function GoImplementationProvider(
	goCtx: GoExtensionContext,
	includeImports?: boolean
): GoplsImplementationProvider {
	return new GoplsImplementationProvider(goCtx, includeImports);
}

export class GoplsImplementationProvider implements vscode.ImplementationProvider {
	constructor(private readonly goCtx: GoExtensionContext, private includeImports?: boolean) { }
	public async provideImplementation(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
		Promise<vscode.Definition | vscode.LocationLink[] | null | undefined> {
		const { languageClient, serverInfo } = this.goCtx;
		if (!languageClient) {
			return [];
		}
		const params = languageClient.code2ProtocolConverter.asTextDocumentPositionParams(document, position);
		return languageClient.sendRequest(ImplementationRequest.type, params, token).then((result) => {
			if (token.isCancellationRequested) {
				return null;
			}
			const ret = languageClient.protocol2CodeConverter.asDefinitionResult(result, token);
			const implementationConfig = getGoConfig()['implementation'];
			let include = "";
			let exclude = "";
			if (implementationConfig) {
				include = implementationConfig["filesInclude"] as string;
				exclude = implementationConfig["filesExclude"] as string;
			}
			return ret.then((data) => {
				if (data) {
					const rawLinks = data as vscode.Location[];
					return filter(rawLinks, include, exclude);
				}
			});
		}, (error) => {
			return languageClient.handleFailedRequest(ImplementationRequest.type, token, error, null);
		});



		function filter(links: vscode.Location[], include: string, exclude: string,): vscode.Location[] {
			const ret = links.filter(item => {
				let matches = true;
				if (include && include !== '') {
					matches = glob.match(include, item.uri.toString());
				}

				let doesNotMatch = true;
				if (exclude && exclude !== '') {
					doesNotMatch = !glob.match(exclude, item.uri.toString());
				}
				return matches && doesNotMatch;
			});

			return ret;
		}
	}

	static activate(ctx: vscode.ExtensionContext, goCtx: GoExtensionContext) {
		let languageClient = goCtx.languageClient;
		if (languageClient) {
			languageClient.middleware.provideImplementation = new GoplsImplementationProvider(goCtx, true).provideImplementation;
		}
		vscode.languages.registerImplementationProvider('go', new GoplsImplementationProvider(goCtx, true))
	}

}