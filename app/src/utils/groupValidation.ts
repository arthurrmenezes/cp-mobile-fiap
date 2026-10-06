import { ChatGroup } from '../types/group';

export function hasSpaceInGroup(group: ChatGroup): boolean {
  return group.memberIds.length < group.memberLimit;
}

export function spotsLeft(group: ChatGroup): number {
  return group.memberLimit - group.memberIds.length;
}

export function canReduceLimit(group: ChatGroup, newLimit: number): boolean {
  return newLimit >= group.memberIds.length;
}
