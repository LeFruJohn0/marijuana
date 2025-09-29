import Config from '@common/config';
import { sleep, getRandomInt } from '@common/index';
import { oxmysql as MySQL } from '@overextended/oxmysql';

const global: Record<number, any> = {};

interface MarijuanaData {
  pot: string;
  state: 'empty' | 'normal';
  watered: boolean;
  seed: string | null; // <-- explicitly allow null
  stage: number;
  coords: { x: number; y: number; z: number };
}

onNet('ox_inventory:usedItem', async (playerId: number, name: string, slotId: number, metadata: Record<string, any>) => {
  for (const key in Config.Pots) {
    const pot = Config.Pots[key as keyof typeof Config.Pots];
    if (pot.name === name) {
      // exports.ox_inventory.AddItem(playerId, 'marijuana', 10)
      // emitNet('lfj_marijuana:client:placePot', playerId, key)
      const ped = GetPlayerPed(playerId.toString());
      const [x, y, z] = GetEntityCoords(ped);
      const data: MarijuanaData = {
        pot: key,
        state: 'empty',
        watered: false,
        seed: null,
        stage: 0,
        coords: { x: x, y: y, z: z }
      };
      const id = await MySQL.insert('INSERT INTO `marijuana` (data) VALUES (?)', [JSON.stringify(data)]);
      global[id] = data;
      GlobalState.MARIJUANA = JSON.stringify(global);
      break;
    }
  }
});

onNet('lfj_marijuana:server:removePot', async (id: number) => {
  if (!global[id]) return;
  await MySQL.prepare('DELETE FROM `marijuana` WHERE `id` = ?', [ id ])
  global[id] = null;
  GlobalState.MARIJUANA = JSON.stringify(global);
  await sleep(100);
  emitNet('lfj_marijuana:client:removePot', -1, id)
});

onNet('lfj_marijuana:server:addSoil', async (id: number) => {
  if (!global[id]) return;
  if (exports.ox_inventory.RemoveItem(source, Config.Items.soil, 1)) {
    global[id].state = 'normal';
    GlobalState.MARIJUANA = JSON.stringify(global);
    await sleep(2200);
    emitNet('lfj_marijuana:client:update', -1, id)
  }
});

onNet('lfj_marijuana:server:waterSoil', async (id: number) => {
  if (!global[id]) return;
  if (exports.ox_inventory.RemoveItem(source, Config.Items.water, 1)) {
    global[id].watered = true;
    GlobalState.MARIJUANA = JSON.stringify(global);
    await sleep(2200);
    emitNet('lfj_marijuana:client:update', -1, id)
  }
});

onNet('lfj_marijuana:server:plantSeed', async (id: number, seed: string) => {
  if (!global[id]) return;
  if (exports.ox_inventory.RemoveItem(source, seed, 1)) {
    global[id].seed = seed;
    global[id].stage = 1;
    GlobalState.MARIJUANA = JSON.stringify(global);
    await sleep(2200);
    emitNet('lfj_marijuana:client:update', -1, id)
  }
});

onNet('lfj_marijuana:server:harvest', async (id: number) => {
  if (!global[id]) return;
  const stages = Config.Seeds[global[id].seed].stages;
  const stageCount = Object.keys(stages).length;
  if (global[id].stage == stageCount) {
    exports.ox_inventory.AddItem(source, Config.Seeds[global[id].seed].receive, getRandomInt(Config.Seeds[global[id].seed].amount.min, Config.Seeds[global[id].seed].amount.max));
    global[id].state = 'empty';
    global[id].watered = false;
    global[id].seed = null;
    global[id].stage = 0;
    GlobalState.MARIJUANA = JSON.stringify(global);
    await sleep(2200);
    emitNet('lfj_marijuana:client:update', -1, id)
  }
});

setImmediate(async () => {
  const response = await MySQL.query('SELECT * FROM marijuana')
  if (response) {
    response.forEach((row: any) => {
      global[row.id] = JSON.parse(row.data)
    })
  }
  await sleep(500);
  GlobalState.MARIJUANA = JSON.stringify(global);
});

setInterval(async () => {
  if (global) {
    for (const id in global) {
      const data = (global as any)[id];
      if (data.seed && data.watered) {
        const stages = Config.Seeds[data.seed].stages;
        const stageCount = Object.keys(stages).length;
        if (data.stage < stageCount) {
          data.watered = false;
          data.stage ++;
          GlobalState.MARIJUANA = JSON.stringify(global);
          await sleep(2200);
          emitNet('lfj_marijuana:client:update', -1, id)
        }
      }
    }
  }
}, Config.Growing.Interval);

setInterval(() => {
  if (global) {
    for (const id in global) {
      const data = (global as any)[id];
      MySQL.update('UPDATE marijuana SET data = ? WHERE id = ?', [JSON.stringify(data), id])
    }
  }
}, Config.Database.SaveInterval);

// setTick(() => {
//   // code here (runs every game frame)
// });

// setTimeout( async () => {