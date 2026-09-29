import AsyncStorage from '@react-native-async-storage/async-storage';
import practice from './mantraPractice';
import experience from './mantraExperience';
const writers=new Map(),pending=new Map();
const key=id=>`ds_mantra_practice_v3:${id}`;
export async function loadPractice(id) {
  await (pending.get(id)||Promise.resolve()).catch(()=>{});
  const raw=await AsyncStorage.getItem(key(id));
  return experience.restorePractice(raw?JSON.parse(raw):null,id);
}
export function persistPractice(value) {
  const id=value.mantra_id;
  if(!writers.has(id))writers.set(id,practice.createSerializedWriter(snapshot=>AsyncStorage.setItem(key(id),snapshot)));
  const write=writers.get(id)(JSON.stringify(value));pending.set(id,write);return write;
}
