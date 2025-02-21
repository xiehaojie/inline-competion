
import { ExtensionContext} from "vscode";
import { VsCodeExtension } from "../extension/VsCodeExtension";

export async function activateExtension(context: ExtensionContext) {

    const vscodeExtension = new VsCodeExtension(context);
  
    // // Load Continue configuration
    // if (!context.globalState.get("hasBeenInstalled")) {
    //   context.globalState.update("hasBeenInstalled", true);
    // }
  
    // const api = new VsCodeContinueApi(vscodeExtension);
    // const continuePublicApi = {
    //   registerCustomContextProvider: api.registerCustomContextProvider.bind(api),
    // };
  
    // 'export' public api-surface
    // or entire extension for testing
    return process.env.NODE_ENV === "test"
      ? {
          ...continuePublicApi,
          extension: vscodeExtension,
        }
      : continuePublicApi;
  }