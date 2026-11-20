import { getEnv } from './config/env.js';
import { createApp } from './app.js';
import { createRepository } from './repositories/createRepository.js';

const env = getEnv();
const repository = createRepository();
const app = createApp({ repository });

app.listen(env.PORT, () => {
  console.log(`Zerorez API listening on :${env.PORT} (repository=${env.REPOSITORY})`);
});
