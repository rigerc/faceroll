import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { observeReducedMotion, startFaceAnimation } from "./shared.js";

/** Vue 3 counterpart to the React AgentFace component. */
export const AgentFace = defineComponent({
  name: "FacerollAgentFace",
  inheritAttrs: false,
  props: {
    character: { type: Object, required: true },
    state: { type: String, default: "idle" },
    paused: { type: Boolean, default: false },
  },
  setup(props, { attrs }) {
    const initial = props.character.animations[props.state];
    if (!initial) throw new RangeError("Unknown face state: " + String(props.state));
    const text = ref(initial.still);
    let mounted = false;
    let reduced = false;
    let stop = () => {};
    let unsubscribe = () => {};

    function refresh() {
      stop();
      const animation = props.character.animations[props.state];
      if (!animation) throw new RangeError("Unknown face state: " + String(props.state));
      stop = startFaceAnimation(animation, (frame) => { text.value = frame; }, props.paused || reduced);
    }

    watch(
      () => [props.character, props.state, props.paused],
      () => {
        if (mounted) refresh();
        else text.value = props.character.animations[props.state].still;
      },
      { flush: "sync" },
    );

    onMounted(() => {
      mounted = true;
      unsubscribe = observeReducedMotion((value) => {
        reduced = value;
        refresh();
      });
    });

    onBeforeUnmount(() => {
      mounted = false;
      unsubscribe();
      stop();
    });

    return () => h("span", {
      ...attrs,
      role: attrs.role ?? "img",
      "aria-label": attrs["aria-label"] ?? props.character.name + ": " + props.state,
      "aria-live": attrs["aria-live"] ?? "off",
      style: [{ display: "inline-block", whiteSpace: "pre" }, attrs.style],
    }, text.value);
  },
});
