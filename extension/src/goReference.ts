/*---------------------------------------------------------
 * Copyright 2022 The Go Authors. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------*/

import vscode = require('vscode');
import { ReferencesRequest } from 'vscode-languageserver-protocol';
import { GoExtensionContext } from './context';
import { getGoConfig } from './config';
import * as glob from './common/glob.js';


export function GoImplementationProvider(
	goCtx: GoExtensionContext,
	includeImports?: boolean
): GoplsReferenceProvider {
	return new GoplsReferenceProvider(goCtx, includeImports);
}

export class GoplsReferenceProvider implements vscode.ReferenceProvider {
	constructor(private readonly goCtx: GoExtensionContext, private includeImports?: boolean) { }

	public provideReferences(document: vscode.TextDocument, position: vscode.Position, context: vscode.ReferenceContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Location[]> {
		{
			const { languageClient, serverInfo } = this.goCtx;
			if (!languageClient) {
				return [];
			}

			const params = languageClient.code2ProtocolConverter.asReferenceParams(document, position,context);
			return languageClient.sendRequest(ReferencesRequest.type, params, token).then((result) => {
				if (token.isCancellationRequested) {
					return null;
				}
				const ret = languageClient.protocol2CodeConverter.asDefinitionResult(result, token);
				const referenceConfig = getGoConfig()['reference'];
				let include = "";
				let exclude = "";
				if (referenceConfig){
					include = referenceConfig["filesInclude"] as string;
					exclude = referenceConfig["filesExclude"] as string;
				}
				
				return ret.then((data) => {
					if (data) {
						const rawLinks = data as vscode.Location[];
						return filter(rawLinks, include, exclude);
					}
				});
			}, (error) => {
				return languageClient.handleFailedRequest(ReferencesRequest.type, token, error, null);
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

	}
	static activate(ctx: vscode.ExtensionContext, goCtx: GoExtensionContext) {
		let languageClient = goCtx.languageClient;
		if (languageClient) {
			languageClient.middleware.provideReferences = new GoplsReferenceProvider(goCtx, true).provideReferences;
		}
		vscode.languages.registerReferenceProvider('go', new GoplsReferenceProvider(goCtx, true))
	}

}