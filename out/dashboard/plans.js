// Token Radar farm plans: one plan per protocol, derived from its own record.
//
// Every step names the protocol, its main chain or its category, and carries what it
// costs and how long it takes, so the plan is a working list, not a slogan. The plan
// is generated from the protocol's own record (category, chains, TVL, age, rank) and
// never from a hand-written list of names: the same functions write every protocol's
// plan. board.json's farm steps and the page's detail view both come from here, so
// they can never drift apart.
//
// Gas is a range per chain, from what a transaction on that chain usually costs; the
// page states the range, never a quote. Capital follows the protocol's TVL: bigger
// protocols need a bigger position to count. Hold days follow the protocol's age:
// younger protocols get a longer qualifying window.

(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Plans = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  /** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
  function stepText(step) {
    let s = step.text + ' Cost: ' + step.cost + '. Time: ' + step.time + '.';
    if (s.length > 600) s = s.slice(0, 596) + '...';
    if (s.length < 20) s = s + ' Hold the position and check the protocol\u2019s own page.';
    return s;
  }

  /** The first chain a protocol names, or a neutral phrase. */
  function chainOf(p) {
    return p.chains && p.chains.length > 0 ? p.chains[0] : 'its main chain';
  }

  /** What one transaction usually costs on a chain, as a range, never a quote. */
  function gasFor(chain) {
    const c = (chain || '').toLowerCase();
    if (c.indexOf('ethereum') !== -1) return { tx: '$4\u2013$8', txLow: 4, txHigh: 8 };
    if (c.indexOf('solana') !== -1) return { tx: 'under $0.05', txLow: 0.01, txHigh: 0.05 };
    if (c.indexOf('base') !== -1 || c.indexOf('arbitrum') !== -1 || c.indexOf('optimism') !== -1) return { tx: '$0.05\u2013$0.30', txLow: 0.05, txHigh: 0.3 };
    if (c.indexOf('binance') !== -1 || c.indexOf('bnb') !== -1) return { tx: '$0.10\u2013$0.30', txLow: 0.1, txHigh: 0.3 };
    if (c.indexOf('polygon') !== -1) return { tx: '$0.02\u2013$0.10', txLow: 0.02, txHigh: 0.1 };
    if (c.indexOf('avalanche') !== -1) return { tx: '$0.10\u2013$0.50', txLow: 0.1, txHigh: 0.5 };
    if (c.indexOf('monad') !== -1 || c.indexOf('hyperliquid') !== -1) return { tx: 'about $0.05', txLow: 0.02, txHigh: 0.08 };
    return { tx: 'about $0.50', txLow: 0.2, txHigh: 0.5 };
  }

  /** How much capital one farm position needs, from the protocol's own TVL. */
  function capitalFor(p) {
    if (p.tvl_usd >= 5000000000) return 250;
    if (p.tvl_usd >= 1000000000) return 150;
    if (p.tvl_usd >= 100000000) return 100;
    return 50;
  }

  /** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
  function holdDaysFor(age) {
    if (age === null) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }

  /** The category's main action, in the words a farmer can follow. */
  function actionFor(p, capital, chain) {
    const c = (p.category || '').toLowerCase();
    const name = p.name;
    if (c.indexOf('lend') !== -1 || c.indexOf('cdp') !== -1 || c.indexOf('collateral') !== -1) {
      return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open';
    }
    if (c.indexOf('dex') !== -1 || c.indexOf('leveraged farm') !== -1) {
      return 'Provide $' + capital + ' of liquidity to ' + name + '\u2019s main pool on ' + chain + ' and keep the position open';
    }
    if (c.indexOf('yield') !== -1 || c.indexOf('farm') !== -1) {
      return 'Deposit $' + capital + ' of USDC into ' + name + '\u2019s main vault on ' + chain + ' and keep the shares';
    }
    if (c.indexOf('staking') !== -1 || c.indexOf('restak') !== -1) {
      return 'Stake $' + capital + ' of the chain\u2019s staking asset through ' + name + ' and keep the receipt';
    }
    if (c.indexOf('perpetual') !== -1 || c.indexOf('derivative') !== -1 || c.indexOf('options') !== -1) {
      return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedge';
    }
    if (c.indexOf('prediction') !== -1) {
      return 'Fund $' + capital + ' and place one market position on ' + name + ' on ' + chain;
    }
    if (c.indexOf('curator') !== -1 || c.indexOf('allocator') !== -1 || c.indexOf('manager') !== -1) {
      return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares';
    }
    if (c.indexOf('stable') !== -1 || c.indexOf('algo-stables') !== -1) {
      return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain;
    }
    if (c.indexOf('rwa') !== -1) {
      return 'Mint $' + capital + ' of ' + name + '\u2019s yield asset on ' + chain + ' and hold it';
    }
    if (c.indexOf('insurance') !== -1) {
      return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy';
    }
    if (c.indexOf('bridge') !== -1) {
      return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app';
    }
    if (c.indexOf('chain') !== -1) {
      return 'Bridge $' + capital + ' of USDC to ' + name + '\u2019s chain and use it in one app there';
    }
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open';
  }

  /** The category's weekly action: the same position, worked again, not a fresh slog. */
  function weeklyFor(p, chain) {
    const c = (p.category || '').toLowerCase();
    const name = p.name;
    if (c.indexOf('lend') !== -1 || c.indexOf('cdp') !== -1 || c.indexOf('collateral') !== -1) {
      return 'Repay a small part of the borrow on ' + name + ' and re-supply it, so the week shows a fresh action';
    }
    if (c.indexOf('dex') !== -1 || c.indexOf('leveraged farm') !== -1) {
      return 'Swap a small amount through ' + name + '\u2019s main pool on ' + chain + ' and leave the liquidity in place';
    }
    if (c.indexOf('yield') !== -1 || c.indexOf('farm') !== -1) {
      return 'Harvest the rewards ' + name + ' paid this week and re-deposit them into the same vault';
    }
    if (c.indexOf('staking') !== -1 || c.indexOf('restak') !== -1) {
      return 'Claim the staking rewards ' + name + ' paid and restake them through the same route';
    }
    if (c.indexOf('perpetual') !== -1 || c.indexOf('derivative') !== -1 || c.indexOf('options') !== -1) {
      return 'Close the small hedge on ' + name + ' and open a fresh one at the same size';
    }
    if (c.indexOf('prediction') !== -1) {
      return 'Place one more small market position on ' + name + ', on a market that closes that week';
    }
    if (c.indexOf('curator') !== -1 || c.indexOf('allocator') !== -1 || c.indexOf('manager') !== -1) {
      return 'Check ' + name + '\u2019s latest vault rebalance and top the position up by a small amount';
    }
    if (c.indexOf('stable') !== -1 || c.indexOf('algo-stables') !== -1) {
      return 'Mint or deposit a small top-up through ' + name + ' and keep the balance in the same asset';
    }
    if (c.indexOf('rwa') !== -1) {
      return 'Check the yield ' + name + ' accrued this week and add a small top-up to the same holding';
    }
    if (c.indexOf('insurance') !== -1) {
      return 'Check the cover ' + name + ' holds for you and renew a small part of it before it lapses';
    }
    return 'Make one qualifying action on ' + name + ' this week, such as a deposit, a swap or a vote';
  }

  /**
   * A protocol's farm plan: seven steps, each an action with a cost and a time. The plan is
   * derived from the protocol's own record (category, chains, TVL, age, rank), never from a
   * hand-written list of names.
   */
  function farmSteps(p, age, rank) {
    const chain = chainOf(p);
    const gas = gasFor(chain);
    const capital = capitalFor(p);
    const hold = holdDaysFor(age);
    const action = actionFor(p, capital, chain);
    const weekly = weeklyFor(p, chain);
    return [
      {
        text: 'Open ' + p.name + '\u2019s own app on ' + chain + ' with a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline',
        cost: gas.tx + ' of gas for the first transaction',
        time: '5 minutes',
      },
      {
        text: action,
        cost: '$' + capital + ' of capital and ' + gas.tx + ' of gas',
        time: '15 minutes to set up',
      },
      {
        text: weekly,
        cost: gas.tx + ' of gas a week',
        time: '10 minutes a week',
      },
      {
        text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot',
        cost: 'the $' + capital + ' stays in the position',
        time: hold + ' days',
      },
      {
        text: 'Watch ' + p.name + '\u2019s own announcements and points page for a program; if one opens, finish its first task the same week it appears',
        cost: 'nothing but the watch',
        time: '10 minutes a week',
      },
      {
        text: 'Before you withdraw, open ' + p.name + '\u2019s own points or rewards page and claim only from the link it publishes: never pay to claim, and never trust a claim link from a chat, a search ad or a DM',
        cost: 'no fee to check',
        time: '10 minutes',
      },
      {
        text: 'Write the wallet, the dates and every transaction for ' + p.name + ' (rank #' + rank + ') in a farm log, so you can repeat the position or unwind it',
        cost: 'nothing but the log',
        time: '5 minutes',
      },
    ];
  }

  /** The plan's estimated cost, for the detail view: capital plus gas over the hold. */
  function estimateFor(p, age) {
    const chain = chainOf(p);
    const gas = gasFor(chain);
    const capital = capitalFor(p);
    const hold = holdDaysFor(age);
    const weeks = Math.max(1, Math.ceil(hold / 7));
    const txs = 1 + weeks + 1; // first transaction, one a week, one to claim or withdraw
    const low = Math.round((gas.txLow * txs) * 10) / 10;
    const high = Math.round((gas.txHigh * txs) * 10) / 10;
    return { capital: capital, gasLow: low, gasHigh: high, hold: hold, txs: txs, chain: chain };
  }

  return { stepText: stepText, farmSteps: farmSteps, gasFor: gasFor, capitalFor: capitalFor, holdDaysFor: holdDaysFor, estimateFor: estimateFor };
});
