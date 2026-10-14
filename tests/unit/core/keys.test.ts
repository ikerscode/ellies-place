import { describe, expect, it } from 'vitest';
import {
  ENUM_KEY_FAMILIES,
  aspTierGoalKey,
  aspTierKey,
  aspTierRewardKey,
  intKey,
  itemNameKey,
  mailBodyKey,
  mailSubjectKey,
  needHelpKey,
  needNameKey,
  paintKey,
  patternKey,
  placementErrorKey,
  reasonKey,
  requiredEnumKeys,
  skillKey,
  structDoorKey,
  structWallKey,
  structWindowKey,
  interactionIconKey,
  wishTitleKey,
  PLACEMENT_ERRORS,
} from '../../../src/core/keys';

describe('key builders', () => {
  it('use the FROZEN 22 spellings', () => {
    expect(intKey('sofa.sit')).toBe('int.sofa.sit');
    expect(wishTitleKey('bow_george')).toBe('wish.bow_george');
    expect(mailSubjectKey('pickle_welcome')).toBe('mail.pickle_welcome.subject');
    expect(mailBodyKey('pickle_welcome')).toBe('mail.pickle_welcome.body');
    expect(itemNameKey('sofa_basic')).toBe('item.sofa_basic.name');
    expect(placementErrorKey('breaksPath')).toBe('build.err.breaksPath');
    expect(needNameKey('energy')).toBe('ui.need.energy.name');
    expect(needHelpKey('royalty')).toBe('ui.need.royalty.help');
    expect(aspTierKey('hyrox', 2)).toBe('asp.hyrox.tier.2');
    expect(aspTierGoalKey('home', 3)).toBe('asp.home.tier.3.goal');
    expect(aspTierRewardKey('collect', 1)).toBe('asp.collect.tier.1.reward');
    expect(reasonKey('queueFull')).toBe('ui.reason.queueFull');
    expect(skillKey('kitchen')).toBe('ui.skill.kitchen');
    expect(skillKey('skiErg')).toBe('ui.hyrox.skiErg');
  });

  it('use the art-checklist sprite families (FROZEN 39, 40)', () => {
    expect(interactionIconKey('sit')).toBe('icon.int.sit');
    expect(structWallKey('goth')).toBe('struct.wall.goth');
    expect(structDoorKey('front')).toBe('struct.door.front');
    expect(structWindowKey('sash')).toBe('struct.window.sash');
    expect(paintKey('floor.wood.oak')).toBe('paint.floor.wood.oak');
    expect(patternKey('floor', 'hex')).toBe('pattern.floor.hex');
    expect(patternKey('wall', 'band')).toBe('pattern.wall.band');
  });

  it('enum families list every member once with unique keys', () => {
    expect(PLACEMENT_ERRORS).toHaveLength(19);
    const keys = requiredEnumKeys();
    expect(new Set(keys).size).toBe(keys.length);
    expect(ENUM_KEY_FAMILIES.find((f) => f.family === 'ui.bond')?.build('3')).toBe('ui.bond.3');
    expect(keys).toContain('ui.phase.dawn');
    expect(keys).not.toContain('ui.phase.morning');
  });
});
