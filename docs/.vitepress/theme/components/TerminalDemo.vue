<template>
  <div class="terminal-demo">
    <div class="terminal-window">
      <!-- Title bar -->
      <div class="terminal-titlebar">
        <div class="terminal-dots">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
        </div>
        <span class="terminal-title">worclaude</span>
        <div class="terminal-dots-spacer"></div>
      </div>

      <!-- Content area -->
      <div class="terminal-content" ref="contentRef">
        <!-- Step 1: Welcome banner -->
        <transition name="fade">
          <div v-if="currentStep >= 1" class="terminal-block">
            <div class="banner-line banner-name">&nbsp;&nbsp;Worclaude v1.1.0</div>
            <div class="banner-line banner-rule">&nbsp;&nbsp;─────────────────────</div>
            <div class="banner-line">&nbsp;&nbsp;Setting up Claude Code workflow...</div>
            <div class="spacer"></div>
          </div>
        </transition>

        <!-- Step 2: Project type -->
        <transition name="slide-fade">
          <div v-if="currentStep >= 2" class="terminal-block">
            <div v-if="!projectType" class="prompt-section">
              <div class="prompt-line">
                <span class="prompt-qmark">?</span> What type of project?
              </div>
              <div
                v-for="option in projectTypes"
                :key="option"
                class="radio-option"
                :class="{
                  'radio-hover': hoveredOption === 'project-' + option && !pendingProjectType,
                  'radio-selected': pendingProjectType === option,
                  'radio-dimmed': pendingProjectType && pendingProjectType !== option,
                }"
                @mouseenter="hoveredOption = 'project-' + option"
                @mouseleave="hoveredOption = null"
                @click="selectProjectType(option)"
              >
                <span class="radio-bullet">{{
                  pendingProjectType === option
                    ? '◉'
                    : !pendingProjectType && option === projectTypes[0]
                      ? '◉'
                      : '○'
                }}</span>
                {{ option }}
              </div>
            </div>
            <div v-else class="answered-line">
              <span class="prompt-checkmark">✓</span> What type of project?
              <span class="answered-value">{{ projectType }}</span>
            </div>
          </div>
        </transition>

        <!-- Step 3: Tech stack -->
        <transition name="slide-fade">
          <div v-if="currentStep >= 3" class="terminal-block">
            <div v-if="!techStack" class="prompt-section">
              <div class="prompt-line"><span class="prompt-qmark">?</span> Primary language:</div>
              <div
                v-for="option in languages"
                :key="option"
                class="radio-option"
                :class="{
                  'radio-hover': hoveredOption === 'lang-' + option && !pendingTechStack,
                  'radio-selected': pendingTechStack === option,
                  'radio-dimmed': pendingTechStack && pendingTechStack !== option,
                }"
                @mouseenter="hoveredOption = 'lang-' + option"
                @mouseleave="hoveredOption = null"
                @click="selectTechStack(option)"
              >
                <span class="radio-bullet">{{
                  pendingTechStack === option
                    ? '◉'
                    : !pendingTechStack && option === languages[0]
                      ? '◉'
                      : '○'
                }}</span>
                {{ option }}
              </div>
            </div>
            <div v-else class="answered-line">
              <span class="prompt-checkmark">✓</span> Primary language:
              <span class="answered-value">{{ techStack }}</span>
            </div>
          </div>
        </transition>

        <!-- Step 4: Docker -->
        <transition name="slide-fade">
          <div v-if="currentStep >= 4" class="terminal-block">
            <div v-if="!dockerAnswer" class="prompt-section">
              <div class="prompt-line"><span class="prompt-qmark">?</span> Do you use Docker?</div>
              <div
                v-for="option in ['Yes', 'No']"
                :key="option"
                class="radio-option"
                :class="{
                  'radio-hover': hoveredOption === 'docker-' + option && !pendingDocker,
                  'radio-selected': pendingDocker === option,
                  'radio-dimmed': pendingDocker && pendingDocker !== option,
                }"
                @mouseenter="hoveredOption = 'docker-' + option"
                @mouseleave="hoveredOption = null"
                @click="selectDocker(option)"
              >
                <span class="radio-bullet">{{
                  pendingDocker === option ? '◉' : !pendingDocker && option === 'Yes' ? '◉' : '○'
                }}</span>
                {{ option }}
              </div>
            </div>
            <div v-else class="answered-line">
              <span class="prompt-checkmark">✓</span> Do you use Docker?
              <span class="answered-value">{{ dockerAnswer }}</span>
            </div>
          </div>
        </transition>

        <!-- Step 5: Agent selection -->
        <transition name="slide-fade">
          <div v-if="currentStep >= 5" class="terminal-block">
            <div v-if="!agentsContinued" class="prompt-section">
              <div class="agents-header">
                <span class="prompt-checkmark">✓</span> Universal agents installed (5):
              </div>
              <div v-for="agent in universalAgents" :key="agent.name" class="agent-line">
                &nbsp;&nbsp;<span class="prompt-checkmark">✓</span>
                {{ agent.name }}
                <span class="dim-text">({{ agent.detail }})</span>
              </div>
              <div class="spacer-sm"></div>
              <div class="agents-header">Recommended for "{{ projectType }}":</div>
              <div
                v-for="agent in recommendedAgents"
                :key="agent.name"
                class="agent-line agent-selectable"
                @click="toggleAgent(agent)"
              >
                &nbsp;&nbsp;<span
                  :class="agent.selected ? 'checkbox-checked' : 'checkbox-unchecked'"
                  >{{ agent.selected ? '☑' : '☐' }}</span
                >
                {{ agent.name }}
              </div>
              <div class="spacer-sm"></div>
              <button
                class="terminal-button"
                @mouseenter="hoveredOption = 'continue'"
                @mouseleave="hoveredOption = null"
                :class="{ 'button-hover': hoveredOption === 'continue' }"
                @click="continueAgents"
              >
                Continue
              </button>
            </div>
            <div v-else>
              <div class="answered-line">
                <span class="prompt-checkmark">✓</span> Agents configured
                <span class="dim-text">(5 universal + {{ selectedAgentCount }} recommended)</span>
              </div>
            </div>
          </div>
        </transition>

        <!-- Step 6: Scaffold animation -->
        <transition name="slide-fade">
          <div v-if="currentStep >= 6" class="terminal-block">
            <div class="spacer-sm"></div>
            <div class="output-text">Creating workflow structure...</div>
            <div class="spacer-sm"></div>
            <div v-for="(item, index) in scaffoldItems" :key="item">
              <transition name="fade">
                <div v-if="scaffoldIndex > index" class="scaffold-line">
                  &nbsp;&nbsp;<span class="prompt-checkmark">✓</span> {{ item }}
                </div>
              </transition>
            </div>
            <transition name="fade">
              <div v-if="scaffoldDone" class="scaffold-done">
                <div class="spacer-sm"></div>
                &nbsp;&nbsp;<span class="highlight-text">Done!</span> Workflow installed
                successfully.
              </div>
            </transition>
          </div>
        </transition>

        <!-- Step 7: Next steps -->
        <transition name="slide-fade">
          <div v-if="currentStep >= 7" class="terminal-block">
            <div class="spacer"></div>
            <div class="output-text">Next steps:</div>
            <div class="next-step">
              &nbsp;&nbsp;1. Run <span class="highlight-text">/setup</span> to configure
              project-specific details
            </div>
            <div class="next-step">
              &nbsp;&nbsp;2. Launch Claude Code:
              <span class="highlight-text">claude --worktree --tmux</span>
            </div>
            <div class="next-step">
              &nbsp;&nbsp;3. Start with <span class="highlight-text">/start</span> to begin your
              session
            </div>
          </div>
        </transition>

        <!-- Step 8: Reset -->
        <transition name="fade">
          <div v-if="currentStep >= 8" class="terminal-block">
            <div class="spacer"></div>
            <button
              class="terminal-button"
              @mouseenter="hoveredOption = 'reset'"
              @mouseleave="hoveredOption = null"
              :class="{ 'button-hover': hoveredOption === 'reset' }"
              @click="resetDemo"
            >
              Restart Demo
            </button>
          </div>
        </transition>

        <!-- Blinking cursor -->
        <div v-if="showCursor" class="cursor-line">
          <span class="blinking-cursor">█</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';

const currentStep = ref(0);
const showCursor = ref(true);

const projectType = ref(null);
const techStack = ref(null);
const dockerAnswer = ref(null);
const pendingProjectType = ref(null);
const pendingTechStack = ref(null);
const pendingDocker = ref(null);
const agentsContinued = ref(false);
const scaffoldIndex = ref(0);
const scaffoldDone = ref(false);
const hoveredOption = ref(null);

const contentRef = ref(null);

const projectTypes = [
  'Backend / API',
  'Frontend / UI',
  'Full-Stack Web App',
  'Library / Package',
  'CLI Tool',
  'Data / ML Pipeline',
  'DevOps / Infrastructure',
];

const languages = ['Python', 'Node.js / TypeScript', 'Go', 'Rust', 'Java'];

const universalAgents = [
  { name: 'plan-reviewer', detail: 'Opus' },
  { name: 'code-simplifier', detail: 'Sonnet, worktree' },
  { name: 'test-writer', detail: 'Sonnet, worktree' },
  { name: 'build-validator', detail: 'Haiku' },
  { name: 'verify-app', detail: 'Sonnet, worktree' },
];

const recommendedAgents = ref([
  { name: 'api-designer', selected: true },
  { name: 'database-analyst', selected: true },
  { name: 'security-reviewer', selected: true },
  { name: 'auth-auditor', selected: true },
  { name: 'bug-fixer', selected: true },
  { name: 'performance-auditor', selected: true },
]);

const selectedAgentCount = computed(() => recommendedAgents.value.filter((a) => a.selected).length);

const scaffoldItems = computed(() => [
  'CLAUDE.md',
  '.claude/settings.json',
  '.claude/workflow-meta.json',
  `.claude/agents/ (5 universal + ${selectedAgentCount.value} selected)`,
  '.claude/commands/ (12 commands)',
  '.claude/skills/ (9 universal + 3 templates)',
  '.mcp.json',
  'docs/spec/PROGRESS.md',
  'docs/spec/SPEC.md',
]);

let timeouts = [];

function scheduleTimeout(fn, delay) {
  const id = setTimeout(fn, delay);
  timeouts.push(id);
  return id;
}

function clearAllTimeouts() {
  timeouts.forEach((id) => clearTimeout(id));
  timeouts = [];
}

function scrollToBottom() {
  nextTick(() => {
    if (contentRef.value) {
      contentRef.value.scrollTop = contentRef.value.scrollHeight;
    }
  });
}

function selectProjectType(option) {
  if (pendingProjectType.value) return;
  pendingProjectType.value = option;
  scrollToBottom();
  scheduleTimeout(() => {
    projectType.value = option;
    pendingProjectType.value = null;
    scrollToBottom();
    scheduleTimeout(() => {
      currentStep.value = 3;
      scrollToBottom();
    }, 300);
  }, 400);
}

function selectTechStack(option) {
  if (pendingTechStack.value) return;
  pendingTechStack.value = option;
  scrollToBottom();
  scheduleTimeout(() => {
    techStack.value = option;
    pendingTechStack.value = null;
    scrollToBottom();
    scheduleTimeout(() => {
      currentStep.value = 4;
      scrollToBottom();
    }, 300);
  }, 400);
}

function selectDocker(option) {
  if (pendingDocker.value) return;
  pendingDocker.value = option;
  scrollToBottom();
  scheduleTimeout(() => {
    dockerAnswer.value = option;
    pendingDocker.value = null;
    scrollToBottom();
    scheduleTimeout(() => {
      currentStep.value = 5;
      scrollToBottom();
    }, 300);
  }, 400);
}

function toggleAgent(agent) {
  agent.selected = !agent.selected;
}

function continueAgents() {
  agentsContinued.value = true;
  scrollToBottom();
  scheduleTimeout(() => {
    currentStep.value = 6;
    showCursor.value = false;
    scrollToBottom();
    runScaffoldAnimation();
  }, 400);
}

function runScaffoldAnimation() {
  scaffoldItems.value.forEach((_, index) => {
    scheduleTimeout(
      () => {
        scaffoldIndex.value = index + 1;
        scrollToBottom();
      },
      200 * (index + 1)
    );
  });

  const totalDelay = 200 * (scaffoldItems.value.length + 1);

  scheduleTimeout(() => {
    scaffoldDone.value = true;
    scrollToBottom();
  }, totalDelay + 300);

  scheduleTimeout(() => {
    currentStep.value = 7;
    scrollToBottom();
  }, totalDelay + 800);

  scheduleTimeout(() => {
    currentStep.value = 8;
    showCursor.value = true;
    scrollToBottom();
  }, totalDelay + 1200);
}

function resetDemo() {
  clearAllTimeouts();
  currentStep.value = 0;
  projectType.value = null;
  techStack.value = null;
  dockerAnswer.value = null;
  pendingProjectType.value = null;
  pendingTechStack.value = null;
  pendingDocker.value = null;
  agentsContinued.value = false;
  scaffoldIndex.value = 0;
  scaffoldDone.value = false;
  hoveredOption.value = null;
  showCursor.value = true;
  recommendedAgents.value.forEach((a) => (a.selected = true));

  scheduleTimeout(() => {
    startDemo();
  }, 300);
}

function startDemo() {
  currentStep.value = 1;
  scrollToBottom();

  scheduleTimeout(() => {
    currentStep.value = 2;
    scrollToBottom();
  }, 1200);
}

onMounted(() => {
  scheduleTimeout(() => {
    startDemo();
  }, 500);
});

onUnmounted(() => {
  clearAllTimeouts();
});
</script>

<style scoped>
.terminal-demo {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

.terminal-window {
  max-width: 700px;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.2);
  background: #1a1a2e;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.terminal-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
  background: #16162a;
  padding: 0 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.terminal-dots {
  display: flex;
  gap: 6px;
  min-width: 52px;
}

.terminal-dots-spacer {
  min-width: 52px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot-red {
  background: #ff5f56;
}

.dot-yellow {
  background: #ffbd2e;
}

.dot-green {
  background: #27c93f;
}

.terminal-title {
  color: #888;
  font-size: 12px;
  user-select: none;
}

.terminal-content {
  padding: 20px;
  overflow-y: auto;
  max-height: 500px;
  min-height: 200px;
  color: #e0e0e0;
}

.terminal-block {
  margin-bottom: 4px;
}

.banner-name {
  color: #27c93f;
  font-weight: bold;
  font-size: 14px;
}

.banner-rule {
  color: #444;
}

.banner-line {
  color: #e0e0e0;
}

.spacer {
  height: 16px;
}

.spacer-sm {
  height: 8px;
}

.prompt-line {
  margin-bottom: 4px;
  color: #e0e0e0;
}

.prompt-qmark {
  color: #00d4ff;
  font-weight: bold;
  margin-right: 4px;
}

.prompt-checkmark {
  color: #27c93f;
  font-weight: bold;
  margin-right: 4px;
}

.checkbox-checked {
  color: #27c93f;
  font-size: 18px;
  vertical-align: middle;
}

.checkbox-unchecked {
  color: #888;
  font-size: 18px;
  vertical-align: middle;
}

.radio-option {
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  color: #e0e0e0;
  transition: background-color 0.15s ease;
  user-select: none;
}

.radio-option:hover,
.radio-option.radio-hover {
  background: rgba(255, 255, 255, 0.1);
}

.radio-option.radio-selected {
  background: rgba(39, 201, 63, 0.2);
  color: #27c93f;
}

.radio-option.radio-dimmed {
  opacity: 0.4;
  pointer-events: none;
}

.radio-bullet {
  color: #27c93f;
  margin-right: 6px;
}

.answered-line {
  color: #e0e0e0;
  padding: 2px 0;
}

.answered-value {
  color: #00d4ff;
  font-weight: bold;
  margin-left: 4px;
}

.agents-header {
  color: #e0e0e0;
  margin-bottom: 2px;
}

.agent-line {
  color: #e0e0e0;
  padding: 1px 0;
}

.agent-selectable {
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  transition: background-color 0.15s ease;
  user-select: none;
}

.agent-selectable:hover {
  background: rgba(255, 255, 255, 0.1);
}

.dim-text {
  color: #888;
}

.output-text {
  color: #e0e0e0;
}

.scaffold-line {
  color: #e0e0e0;
  padding: 1px 0;
}

.scaffold-done {
  color: #e0e0e0;
}

.highlight-text {
  color: #ffbd2e;
  font-weight: bold;
}

.next-step {
  color: #e0e0e0;
  padding: 1px 0;
}

.terminal-button {
  background: transparent;
  border: 1px solid #27c93f;
  color: #27c93f;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
  margin-top: 4px;
}

.terminal-button:hover,
.terminal-button.button-hover {
  background: rgba(39, 201, 63, 0.15);
}

.cursor-line {
  margin-top: 4px;
}

.blinking-cursor {
  color: #27c93f;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

/* Transitions */
.fade-enter-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from {
  opacity: 0;
}

.slide-fade-enter-active {
  transition: all 0.4s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

/* Responsive */
@media (max-width: 740px) {
  .terminal-window {
    border-radius: 0;
    font-size: 12px;
  }

  .terminal-content {
    padding: 14px;
    min-width: 0;
    overflow-x: auto;
  }
}

/* Scrollbar styling */
.terminal-content::-webkit-scrollbar {
  width: 6px;
}

.terminal-content::-webkit-scrollbar-track {
  background: transparent;
}

.terminal-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.terminal-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}
</style>
