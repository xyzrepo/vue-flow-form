// Form template and logic

<template>
  <div class="vff" :class="{'vff-not-standalone': !standalone, 'vff-is-mobile': isMobile, 'vff-is-ios': isIos}">
    <div class="f-container">
      <div class="f-form-wrap">
        <flow-form-question
          :ref="setQuestionRef"
          v-for="(q, index) in questionList"
          v-bind:question="q"
          v-bind:language="language"
          v-bind:key="'q' + index"
          v-bind:active="q.index === activeQuestionIndex"
          v-model="q.answer"
          v-on:answer="onQuestionAnswered"
          v-bind:reverse="reverse"
          v-bind:disabled="disabled"
          v-on:disable="setDisabled"
          v-bind:autofocus="autofocus"
        />

        <slot></slot>

        <!-- Complete/Submit screen slots -->   
        <div v-if="isOnLastStep" class="vff-animate f-fade-in-up field-submittype">
          <slot name="complete">
            <!-- Default content for the "complete" slot -->
            <div class="f-section-wrap">
              <p>
                <span class="fh2">{{ language.thankYouText }}</span>
              </p>
            </div>
          </slot>

          <slot name="completeButton">
            <!-- Default content for the "completeButton" slot -->
            <button 
              class="o-btn-action"
              ref="button" 
              type="button" 
              href="#" 
              v-on:click.prevent="submit()" 
              v-if="!submitted"
              v-bind:aria-label="language.ariaSubmitText">
                <span>{{ language.submitText }}</span>
            </button>
            <a 
              class="f-enter-desc"
              href="#"
              v-on:click.prevent="submit()"
              v-if="!submitted"
              v-html="language.formatString(language.pressEnter)">
            </a>
            <p class="text-success" v-if="submitted">{{ language.successText }}</p>
          </slot>
        </div>
      </div>
    </div>

    <div class="vff-footer">
      <div class="footer-inner-wrap">
        <div v-if="progressbar" class="f-progress" v-bind:class="{'not-started': percentCompleted === 0, 'completed': percentCompleted === 100}">
          <div class="f-progress-bar">
            <div class="f-progress-bar-inner" v-bind:style="'width: ' + percentCompleted + '%;'"></div>
          </div>
          {{ language.percentCompleted.replace(':percent', percentCompleted) }}
        </div>
        <div v-if="navigation" class="f-nav">
          <a
            class="f-prev"
            href="#"
            v-bind:class="{'f-disabled': activeQuestionIndex === 0 || submitted}"
            v-on:click.prevent="goToPreviousQuestion()"
            role="button"
            v-bind:aria-label="language.ariaPrev"
          >
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
              x="0px"
              y="0px"
              width="42.333px"
              height="28.334px"
              viewBox="78.833 5.5 42.333 28.334"
              aria-hidden="true"
            >
              <path
                d="M82.039,31.971L100,11.442l17.959,20.529L120,30.187L101.02,8.492c-0.258-0.295-0.629-0.463-1.02-0.463c-0.39,0-0.764,0.168-1.02,0.463L80,30.187L82.039,31.971z"
              />
            </svg>
            <span class="f-nav-text" aria-hidden="true">{{ language.prev }}</span>
          </a>
          <a
            class="f-next"
            href="#"
            v-bind:class="{'f-disabled': !isNextQuestionAvailable()}"
            v-on:click.prevent="goToNextQuestion()"
            role="button"
            v-bind:aria-label="language.ariaNext"
          >
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
              x="0px"
              y="0px"
              width="42.333px"
              height="28.334px"
              viewBox="78.833 5.5 42.333 28.334"
              aria-hidden="true"
            >
              <path
                d="M117.963,8.031l-17.961,20.529L82.042,8.031l-2.041,1.784l18.98,21.695c0.258,0.295,0.629,0.463,1.02,0.463c0.39,0,0.764-0.168,1.02-0.463l18.98-21.695L117.963,8.031z"
              />
            </svg>
            <span class="f-nav-text" aria-hidden="true">{{ language.next }}</span>
          </a>
        </div>
        <div v-if="timer" class="f-timer">
          <span>{{ formatTime(time) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  /*!
    Copyright (c) 2020 - present, DITDOT Ltd. - MIT Licence
    https://github.com/ditdot-dev/vue-flow-form
    https://www.ditdot.hr/en
  */

  import FlowFormQuestion from './FlowFormQuestion.vue'
  import QuestionModel, { ChoiceOption, LinkOption, QuestionType } from '../models/QuestionModel'
  import LanguageModel from '../models/LanguageModel'
  import { IsMobile } from '../mixins/IsMobile'
  import { ComponentInstance } from '../mixins/ComponentInstance'
import { computed, nextTick, onBeforeUnmount, onBeforeUpdate, onMounted, watch } from '@vue/runtime-core'
import { useSlots, useAttrs } from 'vue'
  const $slots = useSlots()
  const isIos = IsMobile.isIos
  const isMobile = IsMobile.isMobile
  const setInstance = ComponentInstance.setInstance
  const getInstance = ComponentInstance.getInstance
// props
const props = defineProps({
      questions: {
        type: Array,
        validator: value => value.every(q => q instanceof QuestionModel)
      }, 
      language: {
        type: LanguageModel,
        default: () => new LanguageModel()
      },
      progressbar: {
        type: Boolean, 
        default: true
      },
      standalone: {
        type: Boolean, 
        default: true
      },
      navigation: {
        type: Boolean, 
        default: true
      },
      timer: {
        type: Boolean,
        default: false
      },
      timerStartStep: [String, Number],
      timerStopStep: [String, Number],
      autofocus: {
        type: Boolean,
        default: true
      }
    })
const emit = defineEmits(['complete','submit','step','answer','timer'])
// data refs
const questionRefs = ref([]),
const completed = ref(false),
const submitted = ref(false),
const activeQuestionIndex = ref(0),
const questionList = ref([]),
const questionListActivePath = ref([]),
const reverse = ref(false),
const timerOn = ref(false),
const timerInterval = ref(null),
const time = ref(0),
const disabled = ref(false)
onMounted(() => {
  document.addEventListener('keydown', onKeyDownListener)
  document.addEventListener('keyup', onKeyUpListener, true)
  window.addEventListener('beforeunload', onBeforeUnload)
  setQuestions()
  checkTimer()
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDownListener)
  document.removeEventListener('keyup', onKeyUpListener, true)
  window.removeEventListener('beforeunload', onBeforeUnload)
  stopTimer()
})
onBeforeUpdate(() => {
  questionRefs.value = []
})
const numActiveQuestions = computed(() => questionListActivePath.value.length)
const activeQuestion = computed(() => questionListActivePath.value[activeQuestionIndex.value])
const activeQuestionId = computed(() => {
  const question = questionModels.value[activeQuestionIndex.value]
  if (isOnLastStep.value) { return '_submit' }
  if (question && question.id) { return question.id }
  return null
})
const numCompletedQuestions = computed(() => {
  let num = 0
  questionListActivePath.value.forEach(question => {
    if (question.answered) { ++num }
  })
  return num
})
const percentCompleted = computed(() => {
  if (!numActiveQuestions.value) { return 0 }
  return Math.floor((numCompletedQuestions.value / numActiveQuestions.value) * 100)
})
const isOnLastStep = computed(() => numActiveQuestions.value > 0 && activeQuestionIndex.value === questionListActivePath.value.length)
const isOnTimerStartStep = computed(() => {
  if (activeQuestionId.value === props.timerStartStep) { return true }
  if (!this.timerOn && !this.timerStartStep && activeQuestionIndex.value === 0) { return true }
  return false
})
const isOnTimerStopStep = computed(() => {
  if (submitted.value) { return true }
  if (activeQuestionId.value === props.timerStopStep) { return true }
  return false
})
const questionModels = computed({
  get: () => {
          if (props.questions && props.questions.length) {
            return props.questions
          }

          const questions = []

          if (!props.questions) {
            const classMap = {
              options: ChoiceOption,
              descriptionLink: LinkOption
            }

            const defaultSlot = $slots.default()
            let children = null

            if (defaultSlot && defaultSlot.length) {
              children = defaultSlot[0].children
              if (!children) {
                children = defaultSlot
              } 
            }

            if (children) {
              children
                .filter(q => q.type && q.type.name.indexOf('Question') !== -1)
                .forEach(q => {
                  const props = q.props
                  const componentInstance = getInstance(props.id)
                  let model = new QuestionModel()

                  if (componentInstance.question !== null) {
                    model = componentInstance.question
                  } 

                  if (props.modelValue) {
                    model.answer = props.modelValue
                  }

                  Object.keys(model).forEach(key => {
                    if (props[key] !== undefined) {
                      if (typeof model[key] === 'boolean') {
                        model[key] = props[key] !== false
                      } else if (key in classMap) {
                        const
                          classReference = classMap[key],
                          options = []

                        props[key].forEach(option => {
                          const instance = new classReference()

                          Object.keys(instance).forEach(instanceKey => {
                            if (option[instanceKey] !== undefined) {
                              instance[instanceKey] = option[instanceKey]
                            }
                          })

                          options.push(instance)
                        })

                        model[key] = options
                      } else {
                        switch(key) {
                          case 'type':
                            if (Object.values(QuestionType).indexOf(props[key]) !== -1) {
                              model[key] = props[key]
                            } else {
                              for (const questionTypeKey in QuestionType) {
                                if (questionTypeKey.toLowerCase() === props[key].toLowerCase()) {
                                  model[key] = QuestionType[questionTypeKey]
                                  break
                                }
                              }
                            }
                            break

                          default:
                            model[key] = props[key]
                            break
                        }
                      }
                    }
                  })

                  componentInstance.question = model

                  model.resetOptions()

                  questions.push(model)
                })
            }
          }

          return questions

  }
})
const setQuestionRef = (el) => { questionRefs.value.push(el) }
/**
 * Returns currently active question component (if any).
 */
const activeQuestionComponent = () => questionRefs.value[activeQuestionIndex.value]
const setQuestions = () => {
  setQuestionListActivePath()
  setQuestionList()
}
/**
 * This method goes through all questions and sets the ones
 * that are in the current path (taking note of logic jumps)
 */
const setQuestionListActivePath = () => {
  const questions = []

  if (!questionModels.value.length) { return }

  let
    index = 0,
    serialIndex = 0,
    nextId,
    activeIndex = activeQuestionIndex.value

  do {
    let question = questionModels.value[index]

    if (questions.some(q => q === question)) {
      break
    }
    
    question.setIndex(serialIndex)
    question.language = this.language

    questions.push(question)

    if (!question.jump) {
      ++index
    } else if (question.answered) {
      nextId = question.getJumpId()
      
      if (nextId) {
        if (nextId === '_submit') {
          index = questionModels.value.length
        } else {
          for (let i = 0; i < questionModels.value.length; i++) {
            if (questionModels.value[i].id === nextId) {
              if (i < index && questions.some(q => q === questionModels.value[i])) {
                question.answered = false
                activeIndex = i
                ++index
              } else {
                index = i
              }
              break
            }
          }
        }
      } else {
        ++index
      }
    } else {
      index = questionModels.value.length
    }

    ++serialIndex
  } while (index < questionModels.value.length)

  questionListActivePath.value = questions
  goToQuestion(activeIndex)
}
/**
 * Sets the question list array
 * (all questions up to, and including, the current one)
 */
const setQuestionList = () => {
  const questions = []

  for (let index = 0; index < questionListActivePath.value.length; index++) {
    const question = questionListActivePath.value[index]

    questions.push(question)

    if (!question.answered) {
      if (completed.value) {
        // The "completed" status changed - user probably changed an
        // already entered answer.
        completed.value = false
      }
      break
    }
  }

  questionList.value = questions
}
/**
 * If we have any answered questions, notify user before leaving
 * the page.
 */
onBeforeUnload(event => {
  if (activeQuestionIndex.value > 0 && !submitted.value) {
    event.preventDefault()
    event.returnValue = ''
  }
})
/**
 * Global key listeners, listen for Enter or Tab key events.
 */
const onKeyDownListener = (e) => {
  if (e.key !== 'Tab' || submitted.value) {
    return
  }

  if (e.shiftKey) {
    e.stopPropagation()
    e.preventDefault()

    if (props.navigation) {
      goToPreviousQuestion()
    }
  } else {
    const q = activeQuestionComponent()

    if (q.shouldFocus()) {
      e.preventDefault()

      q.focusField()
    } else {
      e.stopPropagation()

      emitTab()
      reverse.value = false
    }
  }
}
const onKeyUpListener = (e) => {
    if (e.shiftKey || ['Tab', 'Enter'].indexOf(e.key) === -1 || submitted.value) {
      return
    }

    const q = activeQuestionComponent()

    if (e.key === 'Tab' && q.shouldFocus()) {
      q.focusField()
    } else {
      if (e.key === 'Enter') {
        emitEnter()
      } 

      e.stopPropagation()
      reverse.value = false
    }
}
const emitEnter = () => {
  if (disabled.value) {
    return
  }

  const q = activeQuestionComponent()

  if (q) {
    // Send enter event to the current question component
    q.onEnter()
  } else if (completed.value && isOnLastStep.value) {
    // We're finished - submit form
    submit()
  }
}
const emitTab = () => {
  const q = activeQuestionComponent()

  if (q) {
    // Send tab event to the current question component
    q.onTab()
  } else {
    emitEnter()
  }
}
const submit = () => { emitSubmit(); submitted.value = true }

const emitComplete = () => { emit('complete', completed.value, questionList.value) },

const emitSubmit = () => { emit('submit', questionList.value) },

/**
 * Checks if we have another question and if we
 * can jump to it.
 */
const isNextQuestionAvailable = () => {
  if (submitted.value) {
    return false
  }

  const q = activeQuestion.value
  if (q && !q.required) {
    return true
  }

  if (completed.value && !isOnLastStep.value) {
    return true
  }

  return activeQuestionIndex.value < questionList.value.length - 1
}

/**
 * Triggered by the "answer" event in the Question component
 */
const onQuestionAnswered = (question) => {
  if (question.isValid()) {
    emit('answer', question.question)

    if (activeQuestionIndex.value < questionListActivePath.value.length) {
      ++activeQuestionIndex.value
    }
    
    nextTick(() => {
      reverse.value = false

      setQuestions()
      checkTimer()
      // Nested $nextTick so we're 100% sure that setQuestions
      // actually updated the question array
      nextTick(() => {
        const q = activeQuestionComponent()

        if (q) {
          props.autofocus && q.focusField()
          activeQuestionIndex.value = q.question.index
        } else if (isOnLastStep.value) {
          // No more questions left - set "completed" to true
          completed.value = true
          activeQuestionIndex.value = questionListActivePath.value.length
          
          button && button.focus()
        }

        emit('step', activeQuestionId.value, activeQuestion.value)
      })
    })
  } else if (completed.value) {
    completed.value = false
  }
}

/**
 * Jumps to previous question.
 */
const goToPreviousQuestion = () => {
  blurFocus()

  if (activeQuestionIndex.value > 0 && !submitted.value) {
    if (isOnTimerStopStep.value) {
      startTimer()
    }

    --activeQuestionIndex.value

    reverse.value = true

    checkTimer()
  }
}

/**
 * Jumps to next question.
 */
const goToNextQuestion = () => {
  blurFocus()

  if (isNextQuestionAvailable()) {
    emitEnter()
  }

  reverse.value = false
}

/**
 * Jumps to question with specific index.
 */
const goToQuestion = (index) => {
  if (isNaN(+index)) {
    let questionIndex = activeQuestionIndex.value

    questionListActivePath.value.forEach((question, _index) => {
      if (question.id === index) {
        questionIndex = _index
      }
    })

    index = questionIndex
  }

  if (index !== activeQuestionIndex.value) {
    this.blurFocus()

    if (!submitted.value && index <= questionListActivePath.value.length - 1) {
      // Check if we can actually jump to the wanted question.
      do {
        const previousQuestionsAnswered = 
          questionListActivePath.value
            .slice(0, index)
            .every(q => q.answered)

        if (previousQuestionsAnswered) {
          break
        }

        --index
      } while (index > 0)

      reverse.value = index < activeQuestionIndex.value
      activeQuestionIndex.value = index

      checkTimer()
    }
  }
}

/**
 * Removes focus from the currently focused DOM element.
 */
const blurFocus = () => {
  document.activeElement && document.activeElement.blur && document.activeElement.blur()
}

const checkTimer = () => {
  if (props.timer) {
    if (isOnTimerStartStep.value) {
      startTimer()
    } else if (isOnTimerStopStep.value) {
      stopTimer()
    }
  }
}

const startTimer = () => {
  if (props.timer && !timerOn.value) {
    timerInterval.value = setInterval(incrementTime, 1000)
    timerOn.value = true
  }
}

const stopTimer = () => {
  if (timerOn.value) {
    clearInterval(timerInterval.value)
  }
  timerOn.value = false
}

const incrementTime = () => {
  ++time.value
  
  emit('timer', time.value, formatTime(time.value))
}

const formatTime = (seconds) => {
  let
    startIndex = 14,
    length = 5
      
  if (seconds >= 60 * 60) {
    startIndex = 11
    length = 8
  }

  return new Date(1000 * seconds).toISOString().substr(startIndex, length)
}

const setDisabled = (state) => {
  disabled.value = state
}

const reset = () => {
  questionModels.value.forEach(question => question.resetAnswer())
  goToQuestion(0)
}

watch(
  () => completed(), 
  () => { emitComplete() },
)
watch(
  () => submitted(), 
  () => { stopTimer() }
)
</script>

<style lang="css">
  @import '../assets/css/common.css';
</style>
