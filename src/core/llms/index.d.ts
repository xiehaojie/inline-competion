import OpenAI from "openai";

export interface LLM  {
    options:any
    client?: OpenAI
  
    chat(): Promise<string>;
    fimWithStream(): Promise<string>;
    fimWithOpenAI(
        prefix:string, suffix:string
    ): Promise<string>;
  
  }