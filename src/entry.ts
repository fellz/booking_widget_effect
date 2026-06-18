import { Runtime } from 'foldkit'

import { overlay } from '@foldkit/devtools'

import { bookingServicesLayer } from './services'
import { Flags, Message, Model, flags, init, update, view } from './main'

const application = Runtime.makeApplication({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
  resources: bookingServicesLayer(),
  container: document.getElementById('root'),
  devTools: {
    overlay,
    Message,
  },
})

Runtime.run(application)
