import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const PROJECT_FILE = 'project.godot';

const DEFAULT_HEADER = `; Engine configuration file.
; It's best edited using the editor UI and not directly,
; since the parameters that go here are not all obvious.
;
; Format:
;   [section] ; section goes between []
;   param=value ; assign values to parameters

config_version=5
`;

function parseIniSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  let currentSection = '';
  let buffer: string[] = [];

  for (const line of content.split(/\r?\n/)) {
    const match = /^\s*\[(.+)]\s*$/.exec(line);

    if (match) {
      if (currentSection) sections[currentSection] = buffer.join('\n');

      currentSection = match[1] ?? '';
      buffer = [line];
    } else {
      buffer.push(line);
    }
  }

  if (currentSection) sections[currentSection] = buffer.join('\n');

  return sections;
}

function extractHeader(content: string): string {
  const lines = content.split(/\r?\n/);
  const headerLines: string[] = [];

  for (const line of lines) {
    if (/^\s*\[.+\]\s*$/.test(line)) break;

    headerLines.push(line);
  }
  return headerLines.join('\n');
}

function parseSectionToObj(section: string): Record<string, string> {
  const obj: Record<string, string> = {};
  const lines = section.split(/\r?\n/);

  for (const line of lines) {
    if (line.startsWith('[')) continue;

    const match = /^([^=]+)=(.*)$/.exec(line);

    if (match?.[1] && match[2]) {
      obj[match[1].trim()] = match[2].trim();
    }
  }
  return obj;
}

function objToSection(obj: Record<string, string>, sectionName: string): string {
  const lines = [`[${sectionName}]`];

  for (const [k, v] of Object.entries(obj)) {
    lines.push(`${k}=${v}`);
  }
  return lines.join('\n');
}

function applyRuleEntry(
  ruleEntry: MergeConfigEntry,
  key: string,
  existingObj: Record<string, string>,
): string | null {
  if (ruleEntry.rule === 'ignore' && key in existingObj) {
    return existingObj[key] ?? '';
  }

  if (ruleEntry.rule === 'override') {
    return String(ruleEntry.value);
  }

  if (ruleEntry.rule === 'add' && !(key in existingObj)) {
    return String(ruleEntry.value);
  }

  return null;
}

type ApplyMergeRuleParams = {
  key: string;
  section: string;
  existingObj: Record<string, string>;
  templateObj: Record<string, string>;
  mergeRules: Record<string, Record<string, MergeConfigEntry>>;
};

function applyMergeRule({
  key,
  section,
  existingObj,
  templateObj,
  mergeRules,
}: ApplyMergeRuleParams): string {
  const sectionRules = mergeRules[section];
  const ruleEntry = sectionRules?.[key];

  if (ruleEntry) {
    const result = applyRuleEntry(ruleEntry, key, existingObj);

    if (result !== null) {
      return result;
    }
  }

  return existingObj[key] ?? templateObj[key] ?? '';
}

type MergeSectionParams = {
  section: string;
  templateContent: string;
  existingContent: string | undefined;
  mergeRules: Record<string, Record<string, MergeConfigEntry>>;
};

function mergeSection({
  section,
  templateContent,
  existingContent,
  mergeRules,
}: MergeSectionParams): string {
  const templateObj = parseSectionToObj(templateContent);
  const existingObj = existingContent ? parseSectionToObj(existingContent) : {};
  const resultObj: Record<string, string> = { ...templateObj };

  for (const key of Object.keys({ ...templateObj, ...existingObj })) {
    resultObj[key] = applyMergeRule({ key, section, existingObj, templateObj, mergeRules });
  }

  return objToSection(resultObj, section);
}

function generateTemplateFromRules(
  mergeRules: Record<string, Record<string, MergeConfigEntry>>,
): string {
  const sections: string[] = [DEFAULT_HEADER.trim()];

  for (const [sectionName, rules] of Object.entries(mergeRules)) {
    const sectionLines = [`[${sectionName}]`, ''];

    for (const [key, config] of Object.entries(rules)) {
      sectionLines.push(`${key}=${String(config.value)}`);
    }

    sections.push(sectionLines.join('\n'));
  }

  return sections.join('\n\n');
}

function mergeGodotProject(
  existing: string,
  mergeRules: Record<string, Record<string, MergeConfigEntry>>,
): string {
  const template = generateTemplateFromRules(mergeRules);
  const existingHeader = extractHeader(existing);
  const templateHeader = extractHeader(template);
  const header = existingHeader.trim() ? existingHeader : templateHeader;
  const existingSections = parseIniSections(existing);
  const templateSections = parseIniSections(template);
  const merged: string[] = [header];

  for (const [section, templateContent] of Object.entries(templateSections)) {
    const existingContent = existingSections[section];

    merged.push(mergeSection({ section, templateContent, existingContent, mergeRules }));
  }
  return merged.join('\n\n');
}

type MergeRule = 'ignore' | 'override' | 'add';

interface MergeConfigEntry {
  value: string | number;
  rule: MergeRule;
}

const mergeRules: Record<string, Record<string, MergeConfigEntry>> = {
  application: {
    'config/name': { value: 'My Game', rule: 'ignore' },
    'config/tags': { value: 'PackedStringArray("game")', rule: 'add' },
    'config/features': { value: 'PackedStringArray("4.5", "GL Compatibility")', rule: 'override' },
    'config/icon': { value: 'res://icon.svg', rule: 'add' },
  },
  debug: {
    'gdscript/warnings/unused_signal': { value: 0, rule: 'override' },
    'gdscript/warnings/untyped_declaration': { value: 1, rule: 'override' },
    'gdscript/warnings/unsafe_property_access': { value: 2, rule: 'override' },
    'gdscript/warnings/unsafe_method_access': { value: 2, rule: 'override' },
    'gdscript/warnings/unsafe_cast': { value: 1, rule: 'override' },
    'gdscript/warnings/unsafe_call_argument': { value: 1, rule: 'override' },
  },
  display: {
    'window/size/viewport_width': { value: 640, rule: 'add' },
    'window/size/viewport_height': { value: 360, rule: 'add' },
    'window/size/mode': { value: 2, rule: 'ignore' },
    'window/size/resizable': { value: 'false', rule: 'add' },
    'window/size/always_on_top': { value: 'true', rule: 'add' },
    'window/size/window_width_override': { value: 1280, rule: 'add' },
    'window/size/window_height_override': { value: 720, rule: 'add' },
    'window/stretch/mode': { value: '"viewport"', rule: 'add' },
  },
  file_customization: {
    folder_colors: {
      value:
        '{\n"res://src/autoloads/": "gray",\n"res://src/components/": "purple",\n"res://src/entities/": "green",\n"res://src/lib/": "red",\n"res://src/screens/": "blue",\n"res://src/shared/": "orange",\n"res://src/ui/": "teal"\n}',
      rule: 'add',
    },
  },
  input_devices: {
    'pointing/android/enable_long_press_as_right_click': { value: 'true', rule: 'add' },
    'pointing/emulate_touch_from_mouse': { value: 'true', rule: 'add' },
  },
  rendering: {
    'textures/canvas_textures/default_texture_filter': { value: 0, rule: 'add' },
    'renderer/rendering_method': { value: '"gl_compatibility"', rule: 'add' },
    'renderer/rendering_method.mobile': { value: '"gl_compatibility"', rule: 'add' },
    'viewport/hdr_2d': { value: 'true', rule: 'add' },
    'environment/defaults/default_clear_color': {
      value: 'Color(0.15686275, 0.16470589, 0.21176471, 1)',
      rule: 'add',
    },
    '2d/snap/snap_2d_transforms_to_pixel': { value: 'true', rule: 'add' },
    '2d/snap/snap_2d_vertices_to_pixel': { value: 'true', rule: 'add' },
  },
};

export async function handleApplyDefaults() {
  const cwd = process.cwd();
  const projectFilePath = path.join(cwd, PROJECT_FILE);

  if (!fs.existsSync(projectFilePath)) {
    console.log('No project.godot found in the current directory.');
    return;
  }

  const existing = fs.readFileSync(projectFilePath, 'utf-8');
  const merged = mergeGodotProject(existing, mergeRules);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  await new Promise<void>((resolve) => {
    rl.question('Override project.godot with defaults? [y/N] ', (answer) => {
      if (answer.trim().toLowerCase() === 'y') {
        fs.writeFileSync(projectFilePath, merged + '\n', 'utf-8');
        console.log('project.godot updated.');
      } else {
        console.log('Aborted.');
      }

      rl.close();
      resolve();
    });
  });
}
