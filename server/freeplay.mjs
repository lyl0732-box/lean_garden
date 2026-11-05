import {unlocked} from './content.mjs';
export function activeProfile(owner){
  if(!owner.freePlay)return owner;
  owner.practice ||= {id:owner.id,created:new Date().toISOString(),visited:[],completed:{},attempts:{},lastLevel:'n01',introduced:['rfl'],topicsLearned:[],rulesVersion:4,challengeVersion:7,curriculumVersion:9};
  owner.practice.isPractice=true;
  // Practice has separate proofs, but shares the owner's wallet and growth.
  Object.defineProperty(owner.practice,'economy',{value:owner.economy,writable:true,configurable:true,enumerable:false});
  Object.defineProperty(owner.practice,'adminBenefits',{value:owner.adminBenefits===true,writable:true,configurable:true,enumerable:false});
  owner.practice.prologueSeen=!!owner.prologueSeen;
  owner.practice.tutorials=owner.tutorials||[];
  owner.practice.guidedTutorials=owner.guidedTutorials||[];
  owner.practice.collectionUnlocked=[...unlocked(owner)];
  return owner.practice;
}
