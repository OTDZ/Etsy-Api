import readline from "readline";

const cli = readline.createInterface({ input: process.stdin, output: process.stdout });

function questionCli(output) {
    return new Promise(resolve => {
        cli.question(output, answer => {
            console.log();
            resolve(answer);
        });
    });
}

export async function question(output) {
    return await questionCli(`${output}\n`);
}

