import { MassUnit } from '@components/Constants';
import { Argument } from 'klasa';

export default class CoinSideArgument extends Argument {
  run(arg: MassUnit) {
    if (MassUnit[arg]) return MassUnit[arg];

    throw new Error(`Has to be one of ${Object.keys(MassUnit).map(val => `\`${val}\``).join(', ')}`);
  }
}