
import OpenAI from "openai";
import { Qwen } from "./llms";
class FimModel {
  model: any;
  constructor(fimSetting:any) {

    if (fimSetting.type === 'openai') {
        this.model = selectModelByModelType(fimSetting.modelType,new OpenAI({
            apiKey:fimSetting.openAI.apiKey,
            baseURL:fimSetting.openAI.baseURL,
            
        }));
    }else{
        this.model ={};
    }
  }
}

 function selectModelByModelType(modelType:string,client:OpenAI){

    if (modelType === 'qwen') {
        return new Qwen({},client);
    }
    return {};
}

export class llmOpenAI {
  // fim模型
    fim: FimModel;
  // chat模型
//   private chat: any;

  constructor(setting: any) {
    this.fim = new FimModel(setting.fim);
    // this.chat = new ChatModel(setting.chat);
  }
}
