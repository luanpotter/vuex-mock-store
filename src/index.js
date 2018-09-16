import clone from 'lodash.clone'

export default class Store {
  constructor({ getters = {}, state = {} } = {}) {
    this.dispatch = jest.fn()
    this.commit = jest.fn()
    this.getters = this.__initialGetters = getters
    this.state = clone((this.__initialState = state))
    // this is necessary for map* helpers
    this._modulesNamespaceMap = new Proxy(
      {},
      {
        // always return the root store as the context module
        get: (target, prop) => ({
          context: this,
        }),
      }
    )
  }

  reset() {
    this.dispatch.mockReset()
    this.commit.mockReset()
    this.getters = this.__initialGetters
    this.state = clone(this.__initialState)
  }
}
