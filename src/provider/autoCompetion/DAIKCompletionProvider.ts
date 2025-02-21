import * as vscode from "vscode";
import {
  handleDocumentText,
  handleDocumentTextWithPreSuf,
} from "./renderPrompt";
import { AutocompleteDebouncer } from "../../util/debouncer";
import { llmOpenAI } from "../../core";

export class DAIKCompletionProvider
  implements vscode.InlineCompletionItemProvider
{
  private llmOpenAI:llmOpenAI;
  private debouncer:AutocompleteDebouncer;
  constructor(
    llmOpenAI: llmOpenAI,
    debouncer :AutocompleteDebouncer
  ) {
    this.debouncer = debouncer;
    this.llmOpenAI = llmOpenAI;
  }
  public async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
    //@ts-ignore
  ): ProviderResult<InlineCompletionItem[] | InlineCompletionList> {
    // 置空处理
    // if (document.lineAt(position).isEmptyOrWhitespace) {
    //   return undefined;
    // }
    // 防抖
    if (await this.debouncer.delayAndShouldDebounce(1500)) {
      return undefined;
    }
    const items: vscode.InlineCompletionItem[] = [];
    vscode;
    try {
      const abortController = new AbortController();
      const signal = abortController.signal;
      token.onCancellationRequested(() => abortController.abort());
      // 触发
      // 利用fetch按照模版流式获取上下文
      // const lineText = handleDocumentText(document.getText(), position);
      // 利用openai获取上下文，无需品模版
      const { prefix, suffix } = handleDocumentTextWithPreSuf(
        document.getText(),
        position
      );

      //获取请求
      // const respData = await fetchDataWithQwen(lineText, signal);

      // const respData = await fetchDataWithQwen(prefix,suffix);
      const respData = await this.llmOpenAI.fim.getContent(prefix, suffix);

      const range = new vscode.Range(position, position);
      items.push(new vscode.InlineCompletionItem(respData, range));
      return items;
    } catch (error) {
      console.log("error", error);
    } finally {
      return items;
    }
  }
}
