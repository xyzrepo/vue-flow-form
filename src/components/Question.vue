<script setup>
import { onMounted, watch } from '@vue/runtime-core'
import { ComponentInstance } from '../mixins/ComponentInstance'
const setInstance = ComponentInstance.setInstance
const props = defineProps({
  id: null,
  modelValue: [String, Array, Boolean, Number, Object]
})
const question = ref(null)
onMounted(() => {
  setInstance()
})
const emit = defineEmits(['update:modelValue'])
watch('question.answer', (val) => {
  emit('update:modelValue', val)
})
</script>