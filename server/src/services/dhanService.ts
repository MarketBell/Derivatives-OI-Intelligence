import { dhanConfig, isDhanConfigured } from '../config/dhanConfig';
import { OptionChainData } from '../types/optionChain';

export class DhanService {
  /**
   * Check if Dhan API credentials are present in the environment configuration.
   */
  public isConfigured(): boolean {
    return isDhanConfigured();
  }

  /**
   * Fetch Option Chain data from Dhan API.
   * 
   * Note: The exact endpoint URL, parameters, and header structure will be finalized
   * after inspecting the production Dhan API documentation and response format.
   * 
   * @param underlyingIndex Index ticker or underlying symbol (e.g. NIFTY, BANKNIFTY)
   * @param expiry Expiry date string if requested
   */
  public async fetchOptionChain(underlyingIndex: string = 'NIFTY', expiry?: string): Promise<OptionChainData> {
    if (!this.isConfigured()) {
      throw new Error('Dhan API credentials (DHAN_ACCESS_TOKEN and DHAN_CLIENT_ID) are missing or incomplete.');
    }

    // Isolated place for actual Dhan API HTTP request once API contract is finalized.
    // Example placeholder structure:
    // const response = await fetch(`${dhanConfig.baseUrl}/v2/optionchain`, {
    //   headers: {
    //     'access-token': dhanConfig.accessToken,
    //     'client-id': dhanConfig.clientId,
    //     'Content-Type': 'application/json'
    //   }
    // });
    
    throw new Error(
      `Dhan API request details for symbol '${underlyingIndex}' are pending API documentation alignment.`
    );
  }
}

export const dhanService = new DhanService();
