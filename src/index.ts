import { createLiveWorker, createLiveDurableObject } from '@ace/liveServer'


export default createLiveWorker() satisfies ExportedHandler<Env>


export const LiveDurableObject = createLiveDurableObject({
  onMessage(props) {
    console.log('🚨 onMessage > props', props)
  },
  onValidateEvent(request) {
    console.log('🚨 onValidateEvent > request', request)
  },
  onValidateSubscribe(request) {
    console.log('🚨 onValidateSubscribe > request', request)
  }
})
