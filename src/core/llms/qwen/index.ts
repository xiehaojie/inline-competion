import OpenAI from "openai";



export class Qwen{
    private options:any;
    private client:OpenAI
    constructor(options:any,client:OpenAI){
        this.options = options;
        this.client = client;
    }
    // chat
    async chat (){

    }
    // openAI请求
    async fimWithOpenAI (prefix:string, suffix:string){
        const completion = await this.client.completions.create({
            model: "Qwen/Qwen2.5-Coder-7B-Instruct",
            prompt: prefix,
            suffix,
            stream:true,
          });
          let str = "";
          for await (const chunk of completion) {
            str+=chunk.choices[0].text;
          }
          return str;
    }
        // 流式请求
        async fimWithStream (){
        
        }
}