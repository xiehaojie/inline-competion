import * as vscode from "vscode";
import { streamSse, streamResponse } from "./util/streams";
import fetch from "node-fetch";
import axios from "axios";

async function getContent(content: string) {
  let data = JSON.stringify({
    model: "deepseek-chat",
    prompt: content,
    echo: false,
    frequency_penalty: 0,
    logprobs: 0,
    max_tokens: 1024,
    presence_penalty: 0,
    stop: null,
    stream: false,
    stream_options: null,
    suffix: null,
    temperature: 1,
    top_p: 1,
  });

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://api.deepseek.com/beta/completions",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: "Bearer sk-83a7d6ee933a482f9ff66e3164d64b32",
    },
    data: data,
  };

  return axios(config)
    .then((response: any) => {
      console.log("测试获取结果：", JSON.stringify(response.data));
    })
    .catch((error: any) => {
      console.log(error);
    });
}

// async function* fetchData() {
//   const resp = await fetch("https://api.deepseek.com/beta/completions", {
//     method: "POST",
//     body: JSON.stringify({
//       model: "deepseek-chat",
//       prompt: "Once upon a time, ",
//       echo: false,
//       frequency_penalty: 0,
//       logprobs: 0,
//       max_tokens: 1024,
//       presence_penalty: 0,
//       stop: null,
//       stream: true,
//       // stream_options: null,
//       suffix: null,
//       temperature: 1,
//       top_p: 1,
//     }),
//     headers: {
//       "Content-Type": "application/json",
//       Accept: "application/json",
//       Authorization: "Bearer sk-83a7d6ee933a482f9ff66e3164d64b32",
//     },
//   });

//   for await (const chunk of streamSse(resp)) {
//     yield chunk.choices[0].text;
//   }
// }
// let str = "";
// async function generate() {
//   for await (const val of fetchData()) {
//     console.log('fetchData:::',val);
//     str = str + val;
//   }
// }


/**
 * 当扩展被激活时调用的函数。
 * 扩展在命令首次执行时被激活。
 *
 * @param context - 扩展的上下文对象，用于管理扩展的生命周期和资源。
 */
export function activate(_context: vscode.ExtensionContext) {
  // 使用控制台输出诊断信息 (console.log) 和错误信息 (console.error)
  // 这行代码仅在扩展激活时执行一次
  console.log('Congratulations, your extension "daik" is now active!');
  // 命令已在 package.json 文件中定义
  // 现在使用 registerCommand 提供命令的实现
  // commandId 参数必须与 package.json 中的 command 字段匹配
  const disposable = vscode.commands.registerCommand("daik.helloWorld", () => {
    // 每次执行命令时，这里的代码都会被执行
    // 向用户显示一个消息框
    vscode.window.showInformationMessage("Hello World from dontAskIKnow!");
  });

  const disposable2 = vscode.commands.registerCommand(
    "extension.demo.getCurrentFilePath",
    (uri) => {
      // 每次执行命令时，这里的代码都会被执行
      // 向用户显示一个消息框
      vscode.window.showInformationMessage(
        `当前文件(夹)路径是：${uri ? uri.path : "空"}`
      );
    }
  );
  const disposable3 = vscode.languages.registerInlineCompletionItemProvider(
    [{ pattern: "**" }],
    {
      provideInlineCompletionItems: async function provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        _context: vscode.InlineCompletionContext,
        _token: vscode.CancellationToken
      ) {
        console.log("provideInlineCompletionItems triggered", position);
        
        // await getContent();
        const lineText = document.lineAt(position).text;
        const items: vscode.InlineCompletionItem[] = [];
        if (lineText !== "") {
          try {
            const respData = "var a = 1;// 沃特玛是你爹";
            const completionItem = new vscode.InlineCompletionItem("");
            const content = respData;
            completionItem.insertText = content;
            completionItem.range = new vscode.Range(
              position.translate(0, content.length),
              position
            );
            items.push(completionItem);
            return { items };
          } catch (error) {
            console.log("error::", error);
          }
        }
        return { items };
      },
    }
  );
  // // 注册一个命令，该命令将在编辑器中执行
  // const disposable3 = vscode.commands.registerTextEditorCommand('extension.testEditorCommand',(textEditor, edit) => {
  // 	console.log('您正在执行编辑器命令！');
  // 	console.log(textEditor, edit);
  // });

  // 将 disposable 对象添加到上下文的订阅列表中，以便在扩展停用或卸载时自动释放资源
  _context.subscriptions.push(disposable);
  _context.subscriptions.push(disposable2);
  // context.subscriptions.push(disposable3);
  _context.subscriptions.push(disposable3);
}

// This method is called when your extension is deactivated
export function deactivate() {}