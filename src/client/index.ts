import Config from '@common/config';
import { sleep, getDistance } from '@common/index';
import { cache } from '@overextended/ox_lib/client';
import lib from '@overextended/ox_lib/client'

let local: any = {};
let global: any = {}

function Spawn(id: any) {
  let data = global[id];
  const pot = Config.Pots[data.pot as keyof typeof Config.Pots];
  let model = null;
  if (data.state === 'empty') {
    model = pot.empty
  } else if (data.state === 'normal' && data.watered) {
    model = pot.watered
  } else {
    model = pot.normal
  }
  lib.requestModel(model, 20000);
  let prop = CreateObject(model, data.coords.x, data.coords.y, data.coords.z, false, false, true);
  SetModelAsNoLongerNeeded(model);
  PlaceObjectOnGroundProperly(prop);
  FreezeEntityPosition(prop, true);
  data.prop = prop;
  let stageCount = 0;
  if (data.seed) {
    const plantmodel = Config.Seeds[data.seed].stages[data.stage];
    if (plantmodel) {
      lib.requestModel(plantmodel, 20000);
      let plantprop = CreateObject(plantmodel, data.coords.x, data.coords.y, data.coords.z, false, false, true);
      SetModelAsNoLongerNeeded(plantmodel);
      AttachEntityToEntity(plantprop, prop, 0, 
      0.0, 0.0, 0.1,   
      0.0, 0.0, 0.0,
      true, true, false, true, 1, true);
      FreezeEntityPosition(plantprop, true);
      data.plant_prop = plantprop;
    }
    stageCount = Object.keys(Config.Seeds[data.seed].stages).length;
  }
  local[id] = data;
  exports.ox_target.addLocalEntity(prop, [
    {
      label: 'Pickup Pot',
      distance: 1.5,
      onSelect: async (): Promise<void> => {
        const alert = await lib.alertDialog({
          header: 'Confirm',
          content: 'Are you sure you want to pick up the pot ?',
          centered: true,
          cancel: true,
        });
        if (alert === "confirm") {
          if (await lib.progressBar({
            duration: 2000,
            label: 'Picking up the pot..',
            useWhileDead: false,
            canCancel: false,
            disable: {
              move: true,
              car: true,
              mouse: false,
              combat: true,
            },
            anim: {
              dict: 'pickup_object',
              clip: 'pickup_low',
            },
          })) emitNet('lfj_marijuana:server:removePot', id);
        }
      },
    },
    {
      label: 'Add Soil',
      distance: 1.5,
      canInteract: (): boolean => {
        return data.state === 'empty' && exports.ox_inventory.GetItemCount(Config.Items.soil) > 0;
      },
      onSelect: (): void => {
        emitNet('lfj_marijuana:server:addSoil', id);
      },
    },
    {
      label: 'Water Soil',
      distance: 1.5,
      canInteract: (): boolean => {
        return data.state === 'normal' && data.watered === false && exports.ox_inventory.GetItemCount(Config.Items.water) > 0;
      },
      onSelect: (): void => {
        emitNet('lfj_marijuana:server:waterSoil', id);
      },
    },
    {
      label: 'Harvest',
      distance: 1.5,
      canInteract: (): boolean => {
        return data.seed && stageCount == data.stage;
      },
      onSelect: (): void => {
        emitNet('lfj_marijuana:server:harvest', id);
      },
    },
    {
      label: 'Plant Seed',
      distance: 1.5,
      canInteract: (): boolean => {
        return data.state === 'normal' && data.watered === true && !data.seed;
      },
      onSelect: async (): Promise<void> => {
        const options: Array<{ title: string; onSelect: () => void }> = [];

        for (const [k] of Object.entries(Config.Seeds)) {
            const itemCount: number = await exports.ox_inventory.GetItemCount(k);
            if (itemCount > 0) {
                const playerItems = await exports.ox_inventory.GetPlayerItems();
                for (const y of playerItems) {
                  if (y.name === k) {
                    options.push({
                        title: y.label,
                        onSelect: () => emitNet('lfj_marijuana:server:plantSeed', id, k)
                    });
                  }
                }
            }
        }

        // wait 1.5 seconds like the Lua Wait(1500)
        await sleep(1500);

        lib.registerContext({
            id: 'sbb-marijuana:selectseed',
            title: 'Alege samanta pe care vrei sa o plantezi',
            options
        });

        lib.showContext('sbb-marijuana:selectseed');
      },
    },
  ]);
}

function Despawn(id: any) {
  let data = local[id]
  SetEntityAsMissionEntity(data.prop, false, true)
  DeleteObject(data.prop)
  if (data.plant_prop) {
    SetEntityAsMissionEntity(data.plant_prop, false, true)
    DeleteObject(data.plant_prop)
  }
  local[id] = null;
}

setInterval(() => {
  let [x, y, z] = GetEntityCoords(cache.ped, false);
  if (global) {
    for (const k in global) {
      const v = (global as any)[k];
      if (v) {
        if (!local[k] && getDistance([x,y,z], [v.coords.x, v.coords.y, v.coords.z]) < 50.0) {
          Spawn(k);
        }
      }
    }
  }
  if (local) {
    for (const k in local) {
      const v = (local as any)[k];
      if (v) {
        if (getDistance([x,y,z], [v.coords.x, v.coords.y, v.coords.z]) > 50.0) {
          Despawn(k);
        }
      }
    }
  }
}, 5000);

AddStateBagChangeHandler('MARIJUANA', 'global', async (bagName: string, key: string, value: string) => {
  await sleep(500);
  global = JSON.parse(GlobalState.MARIJUANA as string);
});

onNet('lfj_marijuana:client:removePot', (id: number) => {
  if (!local[id]) return;
  Despawn(id);
});

onNet('lfj_marijuana:client:update', async (id: number) => {
  if (!local[id]) return;
  Despawn(id);
  await(500)
  Spawn(id)
});

on('ox:playerLoaded', (playerId: number, isNew: boolean) => {
  global = JSON.parse(GlobalState.MARIJUANA as string);
});

onNet("onResourceStop", (resource: string) => {
  if (resource !== "lfj_marijuana") return;
  if (local) {
    for (const k in local) {
      Despawn(k);
    }
  }
});

onNet("onResourceStart", (resource: string) => {
  if (resource !== "lfj_marijuana") return;
  global = JSON.parse(GlobalState.MARIJUANA as string);
});

// DUI

let duiObject: number | undefined;

function createHackingDUI(): [number] {
    const duiObj = CreateDui("nui://lfj_marijuana/dist/web/index.html", 256, 256);
    const duiHnd = GetDuiHandle(duiObj);

    const txd = CreateRuntimeTxd("dui_texture");
    CreateRuntimeTextureFromDuiHandle(txd, "dui_handle", duiHnd);
    AddReplaceTexture("w_am_hackdevice_m32", "script_rt_w_am_hackdevice_m32", "dui_texture", "dui_handle");

    // Wait until DUI is ready
    while (!IsDuiAvailable(duiObj)) {
        Wait(100);
    }

    return [duiObj];
}

function deleteHackingDUI(duiObj: number) {
    RemoveReplaceTexture("w_am_hackdevice_m32", "script_rt_w_am_hackdevice_m32");
    DestroyDui(duiObj);
}

setTick(async () => {
  if (local) {
    const weapon = GetSelectedPedWeapon(PlayerPedId());
    if (weapon === GetHashKey("WEAPON_HACKINGDEVICE")) {

      if (!duiObject) {
        const [obj] = createHackingDUI();
        duiObject = obj;

        // Wait until React/HTML is ready
        while (!IsDuiAvailable(duiObject)) {
          await sleep(100);
        }
      }

      const [aiming, entity] = GetEntityPlayerIsFreeAimingAt(PlayerId());
      if (aiming && DoesEntityExist(entity)) {
        for (const k in local) {
          const v = (local as any)[k];
          if (v) {
            if (v.prop === entity) {
              let stage = null;
              if (v.seed) {
                const stageCount = Object.keys(Config.Seeds[v.seed].stages).length;
                stage = v.stage+'/'+stageCount;
              }
              SendDuiMessage(duiObject, JSON.stringify({
                action: 'update',
                data: {
                  stage: stage,
                  watered: v.watered
                },
              }))
            }
          }
        }
      } else {
        SendDuiMessage(duiObject!, JSON.stringify({ action: "clear" }))
        await sleep(1000);
      }
    } else if (duiObject) {
      deleteHackingDUI(duiObject);
      duiObject = undefined;
    } else {
      await sleep(1000);
    }
  } else {
    await sleep(1000);
  }
});