import {initStore} from '../server/store.mjs';import {initAccounts,seedAdmin} from '../server/accounts.mjs';
// Credentials come through stdin, never from command arguments or source files.
const chunks=[];for await(const chunk of process.stdin)chunks.push(chunk);const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
await initStore();await initAccounts();const result=await seedAdmin(input.username,input.password);console.log(JSON.stringify(result));
