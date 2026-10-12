import { describe, expect, it } from 'vitest'
import { endpointPushValido } from './endpoint'

describe('endereço de notificação', () => {
  it('aceita os serviços de push dos navegadores', () => {
    expect(endpointPushValido('https://fcm.googleapis.com/fcm/send/abc')).toBe(true)
    expect(endpointPushValido('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true)
    expect(endpointPushValido('https://web.push.apple.com/QBz')).toBe(true)
    expect(endpointPushValido('https://api.push.apple.com/3/device/x')).toBe(true)
    expect(endpointPushValido('https://wns2-bl2p.notify.windows.com/w/?token=x')).toBe(true)
  })

  it('recusa qualquer outro endereço (SSRF)', () => {
    expect(endpointPushValido('http://fcm.googleapis.com/x')).toBe(false)
    expect(endpointPushValido('https://169.254.169.254/latest/meta-data')).toBe(false)
    expect(endpointPushValido('https://localhost/x')).toBe(false)
    expect(endpointPushValido('https://fcm.googleapis.com.evil.com/x')).toBe(false)
    expect(endpointPushValido('https://evilpush.apple.com.evil.com/x')).toBe(false)
    expect(endpointPushValido('https://user:pw@fcm.googleapis.com/x')).toBe(false)
    expect(endpointPushValido('https://fcm.googleapis.com:8443/x')).toBe(false)
    expect(endpointPushValido('nao é url')).toBe(false)
  })
})
