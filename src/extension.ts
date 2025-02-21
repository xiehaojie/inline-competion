import * as vscode from "vscode";
import { streamSse } from "./util/streams";
import fetch from "node-fetch";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { getRangeInString } from "./core/prompt/range";
import OpenAI from 'openai';
import Handlebars = require("handlebars");


const client = new OpenAI({
  apiKey:'sk-qewbjoukxuvvykxbssrtvsytvtghodzqmurainijcizrjtzy',
  baseURL:'https://api.siliconflow.cn/v1'
});
// https://huggingface.co/deepseek-ai/deepseek-coder-1.3b-base
const deepseekFimTemplate = {
  template:
    "<｜fim▁begin｜>{{{prefix}}}<｜fim▁hole｜>{{{suffix}}}<｜fim▁end｜>",
  completionOptions: {
    stop: [
      "<｜fim▁begin｜>",
      "<｜fim▁hole｜>",
      "<｜fim▁end｜>",
      "//",
      "<｜end▁of▁sentence｜>",
    ],
  },
};
// https://github.com/QwenLM/Qwen2.5-Coder?tab=readme-ov-file#3-file-level-code-completion-fill-in-the-middle
const qwenCoderFimTemplate = {
  template:
    "<|fim_prefix|>{{{prefix}}}<|fim_suffix|>{{{suffix}}}<|fim_middle|>",
  completionOptions: {
    stop: [
      "<|endoftext|>",
      "<|fim_prefix|>",
      "<|fim_middle|>",
      "<|fim_suffix|>",
      "<|fim_pad|>",
      "<|repo_name|>",
      "<|file_sep|>",
      "<|im_start|>",
      "<|im_end|>",
    ],
  },
};
const getPrompt = (prefix: string, suffix: string) => {
  let template = Handlebars.compile(qwenCoderFimTemplate.template);
  return template({ prefix, suffix });
};
const handleDocumentText = (
  text: string,
  position: vscode.Position
): string => {
  const fileContents = text;
  const fileLines = fileContents.split("\n");
  let prefix = getRangeInString(fileContents, {
    start: { line: 0, character: 0 },
    end: position,
  });
  const suffix = getRangeInString(fileContents, {
    start: position,
    end: { line: fileLines.length - 1, character: Number.MAX_SAFE_INTEGER },
  });
  return getPrompt(prefix, suffix);
};
const handleDocumentTextWithPreSuf = (
  text: string,
  position: vscode.Position
)=> {
  const fileContents = text;
  const fileLines = fileContents.split("\n");
  let prefix = getRangeInString(fileContents, {
    start: { line: 0, character: 0 },
    end: position,
  });
  let suffix = getRangeInString(fileContents, {
    start: position,
    end: { line: fileLines.length - 1, character: Number.MAX_SAFE_INTEGER },
  });
  return {prefix,suffix};
};
export class AutocompleteDebouncer {
  private debounceTimeout: NodeJS.Timeout | undefined = undefined;
  private debouncing = false;
  private lastUUID: string | undefined = undefined;

  async delayAndShouldDebounce(debounceDelay: number): Promise<boolean> {
    // Debounce
    const uuid = uuidv4();
    this.lastUUID = uuid;

    // Debounce
    if (this.debouncing) {
      this.debounceTimeout?.refresh();
      const lastUUID = await new Promise((resolve) =>
        setTimeout(() => {
          resolve(this.lastUUID);
        }, debounceDelay)
      );
      if (uuid !== lastUUID) {
        return true;
      }
    } else {
      this.debouncing = true;
      this.debounceTimeout = setTimeout(async () => {
        this.debouncing = false;
      }, debounceDelay);
    }

    return false;
  }
}
async function fetchData(prompt: string, signal: AbortSignal) {
  const resp = await fetch("https://api.deepseek.com/beta/completions", {
    method: "POST",
    body: JSON.stringify({
      model: "deepseek-chat",
      prompt: prompt,
      echo: false,
      frequency_penalty: 0,
      logprobs: 0,
      max_tokens: 1024,
      presence_penalty: 0,
      stop: deepseekFimTemplate.completionOptions.stop,
      stream: true,
      temperature: 1,
      top_p: 1,
    }),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: "Bearer sk-387466281693407681f98a307be6d4d5",
    },
    signal,
  });
  let str = "";
  if (!resp.body) {
    return "";
  } else {
    for await (const val of streamSse(resp)) {
      console.log('deepseek Coder',val);
      str = str + val.choices[0].text;
    }
  }
  return str;
}
async function fetchDataWithQwen(prefix:string,suffix:string) {
  const completion = await client.completions.create({
    model: "Qwen/Qwen2.5-Coder-7B-Instruct",
    prompt: prefix,
    suffix,
    stream:true,
  });
  let str = "";
  for await (const chunk of completion) {
    str+=chunk.choices[0].text;
    // console.log('cccccc',chunk);
  }
  return str;
}
async function getYuanJingAccessToken(
  app_id: string,
  client_id: string,
  client_secret: string
) {
  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: `https://maas-gz-api.ai-yuanjing.com/openapi/service/v1/oauth/${app_id}/token`,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: "Bearer sk-83a7d6ee933a482f9ff66e3164d64b32",
    },
    data: {
      grant_type: "client_credentials",
      client_id,
      client_secret,
    },
  };
  const res = await axios(config);
  return res.data.data.access_token ?? "";
}
async function fetchYuanJingData(
  prefix:string,suffix:string,client: OpenAI
) {
  const completion = await client.completions.create({
    model: "deepseek-v3",
    prompt: prefix,
    suffix,
    stream:true,
  });
  let str = "";
  for await (const chunk of completion) {
    str+=chunk.choices[0].text;
    // console.log('cccccc',chunk);
  }
  return str;
}
let debouncer = new AutocompleteDebouncer();
/**
 * 当扩展被激活时调用的函数。
 * 扩展在命令首次执行时被激活。
 *
 * @param context - 扩展的上下文对象，用于管理扩展的生命周期和资源。
 */
export async function activate(_context: vscode.ExtensionContext) {
  // 使用控制台输出诊断信息 (console.log) 和错误信息 (console.error)
  const yuanjingAccessToken = await getYuanJingAccessToken(
    "b926332038a84a29b56310940cffbabb",
    "91d4b59a79864b01a7fb14f795039e9c",
    "51e483608dd945899c6a02e4ccfa2654"
  );
  console.log('yuanjingAccessToken:',yuanjingAccessToken);
  const client1 = new OpenAI({
    apiKey:yuanjingAccessToken,
    baseURL:'https://maas-gz-api.ai-yuanjing.com/openapi/compatible-mode/v1'
  });

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
        // 置空处理
        if (document.lineAt(position).isEmptyOrWhitespace) {
          return undefined;
        }
        // 防抖
        if (await debouncer.delayAndShouldDebounce(1500)) {
          return undefined;
        }
        const items: vscode.InlineCompletionItem[] = [];

        try {
          const abortController = new AbortController();
          const signal = abortController.signal;
          _token.onCancellationRequested(() => abortController.abort());
          // 触发
          const lineText = handleDocumentText(document.getText(), position);
          const {prefix,suffix} = handleDocumentTextWithPreSuf(document.getText(), position);
          if (lineText !== "") {
            //获取请求
            // const respData = await fetchDataWithQwen(lineText, signal);

            // const respData = await fetchDataWithQwen(prefix,suffix);
            const respData = await fetchYuanJingData (prefix,suffix,client1);
            const range = new vscode.Range(
              position,
              position,
            );
            items.push(new vscode.InlineCompletionItem(
              respData,
              range
            ));
            return items ;
          }
        } catch(error){
          console.log('error',error);
        } finally {
          return items;
        }
      },
    }
  );
  // 将 disposable 对象添加到上下文的订阅列表中，以便在扩展停用或卸载时自动释放资源
  _context.subscriptions.push(disposable);
  _context.subscriptions.push(disposable2);
  // context.subscriptions.push(disposable3);
  _context.subscriptions.push(disposable3);
}

// This method is called when your extension is deactivated
export function deactivate() {}
