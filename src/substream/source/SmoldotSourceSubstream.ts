import { ApiPromise, WsProvider } from '@polkadot/api';
import type { Header } from '@polkadot/types/interfaces';

export async function connectSource(url: string, query?: string, output?: string) {
  const provider = new WsProvider(url);
  const api = await ApiPromise.create({ provider });

  console.log(`✅ Connected to ${url}`);

  api.rpc.chain.subscribeFinalizedHeads(async (header) => {
    const blockHeader: Header = header as Header;
    console.log(`Finalized block: #${blockHeader.number}`);
    
    // Here we would pull events from block, then filter them
    // For now, just a placeholder
    if (output === 'json') {
      console.log(JSON.stringify({ block: blockHeader.number.toString() }));
    } else {
      console.log(`New finalized block: ${blockHeader.number}`);
    }
  });
}
