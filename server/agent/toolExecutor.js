import { getContact, addContact, removeContact, getContacts } from '../tools/contacts.js';
import getBalance from '../tools/getBalance.js';
import send from '../tools/send.js';
import swapTokens from '../tools/swapTokens.js';
import getPortfolio from '../tools/getPortfolio.js';
import getTokenPrice from '../tools/getTokenPrice.js';
import getTransactionHistory from '../tools/getTransactionHistory.js';
import getPriceHistory from '../tools/getPriceHistory.js';
import getTokenComparison from '../tools/getTokenComparison.js';
import { createTriggerOrder, executeTriggerOrder, cancelTriggerOrder, getTriggerOrders, getMintAddress } from '../tools/triggerOrder.js';

function emitText(emit, content, isToolResponse = true) {
  emit({ type: 'text', content, isToolResponse });
}

function emitError(emit, content) {
  emit({ type: 'error', content });
}

function emitChart(emit, content) {
  emit({ type: 'chart', content });
}

function emitToolCode(emit, content) {
  emit({ type: 'tool_code', content });
}

function toErrorMessage(error) {
  if (!error) return 'Tool error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return error.message || JSON.stringify(error);
}

export async function executeToolCall({ functionCall, walletAddress, emit }) {
  if (!functionCall?.name) {
    return { didEmitData: false };
  }

  const { name, args = {} } = functionCall;

  try {
    switch (name) {
      case 'getBalance': {
        const bal = await getBalance({ ...args, publicKey: walletAddress });
        emitText(emit, `Your ${args.tokenSymbol} balance is ${bal.balance}`);
        return { didEmitData: true };
      }
      case 'send': {
        let toAddress = args.toAddress;
        const contactAddress = getContact(args.toAddress);
        if (contactAddress) {
          toAddress = contactAddress;
          emitText(emit, `Found contact: ${args.toAddress} → ${contactAddress}`);
        }

        const txArgs = await send({ ...args, toAddress, fromAddress: walletAddress });
        emitToolCode(emit, { action: 'createAndSendTransaction', args: txArgs });
        return { didEmitData: true };
      }
      case 'swapTokens': {
        const { serializedTx } = await swapTokens({ ...args, walletAddress });
        emitToolCode(emit, { action: 'signAndSendTransaction', base64Tx: serializedTx });
        return { didEmitData: true };
      }
      case 'getPortfolio': {
        const portfolio = await getPortfolio({ walletAddress });
        emitText(emit, portfolio);
        return { didEmitData: true };
      }
      case 'getTokenPrice': {
        const price = await getTokenPrice(args);
        emitText(emit, price);
        return { didEmitData: true };
      }
      case 'getTransactionHistory': {
        const history = await getTransactionHistory({ ...args, walletAddress });
        emitText(emit, history);
        return { didEmitData: true };
      }
      case 'createTriggerOrder': {
        const result = await createTriggerOrder({
          walletAddress,
          fromMint: await getMintAddress(args.fromToken),
          toMint: await getMintAddress(args.toToken),
          makerAmount: args.makerAmount,
          takerAmount: args.takerAmount,
          slippageBps: args.slippageBps,
          expiryUnix: args.expiry,
        });

        emitToolCode(emit, {
          action: 'signAndSendTransaction',
          base64Tx: result.transaction,
          orderId: result.orderId,
        });
        emitText(emit, `✅ Trigger order created: Order ID ${result.orderId}`);
        return { didEmitData: true };
      }
      case 'executeTriggerOrder': {
        await executeTriggerOrder(args);
        emitText(emit, `🚀 Trigger order executed: Order ID ${args.orderId}`);
        return { didEmitData: true };
      }
      case 'cancelTriggerOrder': {
        const cancelTx = await cancelTriggerOrder({ walletAddress, orderId: args.orderId });
        emitToolCode(emit, {
          action: 'signAndSendTransaction',
          base64Tx: cancelTx.transaction,
          orderId: args.orderId,
        });
        return { didEmitData: true };
      }
      case 'getTriggerOrders': {
        const { orders } = await getTriggerOrders({ walletAddress });

        if (!orders || orders.length === 0) {
          emitText(emit, '⚠️ No active trigger orders found.');
          return { didEmitData: true };
        }

        const mintMap = {
          So11111111111111111111111111111111111111112: 'SOL',
          EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC',
        };

        const formatted = orders
          .map((order) => {
            const inputToken = mintMap[order.inputMint] || order.inputMint;
            const outputToken = mintMap[order.outputMint] || order.outputMint;
            return `Order ID: ${order.orderKey}\n➡️ Selling ${inputToken} to buy ${outputToken}`;
          })
          .join('\n\n');

        emitText(
          emit,
          `📋 Found ${orders.length} active trigger order(s):\n\n${formatted}\n\nWhich order do you want to cancel? Please provide the Order ID.`
        );
        return { didEmitData: true };
      }
      case 'getPriceHistory': {
        const chart = await getPriceHistory(args);
        emitChart(emit, {
          title: `📈 ${chart.tokenSymbol} Price (Last ${chart.days} Days)`,
          type: 'line',
          labels: chart.timestamps,
          values: chart.prices,
        });
        return { didEmitData: true };
      }
      case 'getTokenComparison': {
        const comparison = await getTokenComparison(args);
        emitChart(emit, {
          title: `📊 ${comparison.token1} vs ${comparison.token2} Performance (Last ${comparison.days} Days)`,
          type: 'line',
          labels: comparison.timestamps,
          series: comparison.series,
        });
        return { didEmitData: true };
      }
      case 'getContact': {
        const contactAddress = getContact(args.name);
        if (contactAddress) {
          emitText(emit, `Contact ${args.name} → ${contactAddress}`);
        } else {
          emitText(emit, `No contact found for ${args.name}`);
        }
        return { didEmitData: true };
      }
      case 'addContact': {
        const result = addContact(args.name, args.address);
        emitText(emit, `✅ ${result.message}`);
        return { didEmitData: true };
      }
      case 'removeContact': {
        const result = removeContact(args.name);
        emitText(emit, `✅ ${result.message}`);
        return { didEmitData: true };
      }
      case 'getContacts': {
        const contacts = getContacts();
        if (Object.keys(contacts).length === 0) {
          emitText(emit, '📋 No contacts saved yet.');
          return { didEmitData: true };
        }

        const contactList = Object.entries(contacts)
          .map(([name, address]) => `${name} → ${address}`)
          .join('\n');
        emitText(emit, `📋 Saved Contacts:\n${contactList}`);
        return { didEmitData: true };
      }
      default: {
        emitError(emit, `Unknown tool: ${name}`);
        return { didEmitData: true };
      }
    }
  } catch (error) {
    emitError(emit, `${name} failed: ${toErrorMessage(error)}`);
    return { didEmitData: true };
  }
}