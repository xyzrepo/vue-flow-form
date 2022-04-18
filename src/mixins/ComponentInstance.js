/*
  Copyright (c) 2020 - present, DITDOT Ltd. - MIT Licence
  https://github.com/ditdot-dev/vue-flow-form
  https://www.ditdot.hr/en
*/

const instances = {}

export const ComponentInstance = {
    getInstance: (id) => instances[id],
    setInstance: function() { instances[this.id] = this }
}