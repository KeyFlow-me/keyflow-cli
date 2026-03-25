import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const getVersion = (): string => {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));
        return pkg.version;
    } catch {
        return 'unknown';
    }
};

export const printCatLogo = () => {
    const version = getVersion();
    console.log(chalk.hex('#6366f1')(`
    /\\_____/\\ 
   /  o   o  \\
  ( ==  ^  == )  ${chalk.bold('KeyFlow Blog Editorial Studio')} v${version}
   )         (   ${chalk.gray('https://www.keyflow.me')}
  (           )
 ( (  )   (  ) )
(__(__)___(__)__)
`));
};
