import {unlocked} from './content.mjs';
export function activeProfile(owner,adFree=false){
  if(!(adFree?owner.adFreePlay:owner.freePlay))return owner;
  owner.practice ||= {id:owner.id,created:new Date().toISOString(),visited:[],completed:{},attempts:{},lastLevel:'n01',introduced:['rfl'],topicsLearned:[],rulesVersion:4,challengeVersion:7,curriculumVersion:9};
  owner.practice.isPractice=true;
  owner.practice.prologueSeen=!!owner.prologueSeen;
  owner.practice.tutorials=owner.tutorials||[];
  owner.practice.guidedTutorials=owner.guidedTutorials||[];
  owner.practice.collectionUnlocked=[...unlocked(owner)];
  return owner.practice;
}
