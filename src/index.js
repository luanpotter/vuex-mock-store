// @ts-check
const clone = require('lodash.clonedeep')

const defaultSpy = {
  /**
   * @param {(...args: any[]) => any} [fn] implementation
   */
  create: fn => jest.fn(fn),
  /**
   * @param {jest.Mock} spy
   */
  reset: spy => spy.mockReset(),
  /**
   * @param {jest.Mock} spy
   * @param {(...args: any[]) => any} fn implementation
   */
  mockImplementation: (spy, fn) => spy.mockImplementation(fn),
}

exports.spy = defaultSpy

function getNestedState ({ state, modules, key }) {
  let _state = state
  for (let module of modules) {
    if (_state[module]) _state = _state[module]
    else {
      throw new Error(
        `[vuex-mock-store] module "${key.slice(
          0,
          -1
        )}" not defined in state:\n${JSON.stringify(state, null, 2)}`
      )
    }
  }
  return _state
}

exports.Store = class Store {
  constructor ({ getters = {}, state = {}, spy = defaultSpy } = {}) {
    this._spy = spy
    this.commit = this._spy.create(this._triggerSubscriptions.bind(this))
    this.dispatch = this._spy.create()
    this._initialGetters = getters
    this._initialState = state
    this._initialize()
    /** @type {Function[]} */
    this._handlers = []

    // this is necessary for map* helpers
    /** @type {any} */
    this._modulesNamespaceMap = new Proxy(
      {},
      {
        get: (target, key) => {
          // for Symbols
          if (typeof key !== 'string') return Reflect.get(target, key)

          const modules = key.split('/')
          // modules always have a trailing /
          if (modules.length <= 1) {
            return Reflect.get(target, key)
          }

          // remove trailing empty module
          modules.pop()

          const state = getNestedState({ state: this.state, modules, key })

          return {
            context: {
              dispatch: (name, ...args) => this.dispatch(key + name, ...args),
              commit: (name, ...args) => this.commit(key + name, ...args),
              // make sure we reuse this proxy
              _modulesNamespaceMap: this._modulesNamespaceMap,
              // pass the right state
              state,
              // getters are not nested
              getters: this.getters,
            },
          }
        },
      }
    )
  }

  _initialize () {
    // getters is a plain object
    this.getters = { ...this._initialGetters }
    this.state = clone(this._initialState)
  }

  reset () {
    this._spy.reset(this.dispatch)
    this._spy.reset(this.commit)
    this._initialize()
  }

  subscribe (handler) {
    this._handlers.push(handler)
    return () => {
      this._handlers.splice(this._handlers.findIndex(handler), 1)
    }
  }

  _triggerSubscriptions (type, payload) {
    this._handlers.forEach(fn => fn({ type, payload }, this.state))
  }
}
