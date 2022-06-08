global.stepn_apis = [];
global.rows = [];
global.inQueue = [];
global.utils = require('../utils');
global.date_now = utils.today();


global._config = {
    "spread_sheet": "1WdQ-ZF_5Dv0F9uS7MdmNHYyQB4FGi5CooEMQF2tkdic",
    "spread_sheet_auth_email": "gg-sheet@telegram-notification-346006.iam.gserviceaccount.com",
    "spread_sheet_auth_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDE8SWVrg3uYo38\n/DRJX/j9eyNm9hh3KYMnvRyk1n+b6O8H4te2AgCu+MYr+tieyq+wD1Xr2fxw65f2\nlWP6QTLx/wGEe6+s5gI/yN1qXp4NmgTW0k/6/lq2ypRHtqJNQV5EjY2fkf49ArTD\nBRHMzf9zaOzBk3ImJwg/NcUvx0Mu+75FnUpcYO8PtSRm0Yn2BHxaA9Ho5v7hmGCL\nSJ2BR2010/RvTfA6MpuY6yiMQu3nB1k0QfeJC092KxCOlXDboXyImnidO8+UjPnR\nk14gQFFSYk7iPMuBcnLzdweUksLMnkXWL+2dxfLz88/jc4bV5ISbXmI4ieaNClRB\nRikQTxtpAgMBAAECggEAIcefA7p0B0R+SDtWGJPOmGPLobhqX94N8f388MUd5Dci\n8L5W85AKX/ipvRdsmmf3lII84ZRlOVUfnprnKCCQxXNQ5lF0w3o8PoaMe9c40upt\nFA/Eyi9gjePXZSmNUyT4L1f8R7d53SseqCixceiPfVMs8NMCjEq7nmPxq41JF8Cm\nyQjq6FPKtKJcKR90dFBzCNtO991bsl9H2AaWqpFhrllZPEguJknzzc+A/EORL1b5\nsxPNWbqkQ0xz9a3CpCVMRR2CtJVncdsS7pmOHKgOMNhITOFGDcR35yN1ZUrZRR6u\nJQcpu2ZZZqSehK7tLFUu+6bPL/MxLcu/QCik3/a40QKBgQD8Muxyk26Q4PT5TjS0\nq/cv+JVNgOSMJtLWxfPakanPA/uPJXXxBt5b3vRqisrOvc73b6TX5dNeEzBu4GG1\nkojk59vp6BT1JpcAJXSCwUHaPRGvsQbTtag4kBrEK0cSuZKXw7c2ZBG/aW3GtS7V\nZZb0r6LSxo/CJ5BybeGLSsic1QKBgQDH6QWEYb4rbtWmEENu1dbt7keZz0f8ijIY\niFsZftyU7pIl5QmccVb6y6zBPrIAn54Q39b7ZHRFVQZx/TvDcNCeIb1yFC8qPuX+\nMGEobsW9Oo/iU1vAS6FJ0J7o9aUVtudw3OaPIXiEC+x399/apz97Fio4xhJwWOJG\nq5Bo1Nx+RQKBgQCBYka3yTdSEHbdZ+fWQNsBu1AtgNC/rjNAiDHAkjZBxFNMbvWA\n//sXutw9xJKjWfFSM+6n7HpxqvqQB4FZO6ILfX/vEmeeFXwmURDi++6i3e2y6ukL\nuAhjbFqvBVzjGF1Cit/1gYUxZA8zgERUqle1lF2+MKwT+WQ7sG+jnGwrOQKBgA4D\nZaGcAGqnAE79wNxaHRDcrSQ5BYDMZyqVFF27KNc/yfriDURsJX67HEcHkA6/IaNp\nLXa92fCqPyNqbvAKTnVnRBJlG9FIS3MADS96ZF4ZZtCkqz/VjV7RQvJtlb7p7Vta\nAMdzvzDybQcT1xtKsgZ8zUThjZVWhbYSfLL8iOBJAoGAfzDZa2GN3/fF+O022L/S\nTPFWr20HlfSvEfwqyjqf5WjP5d6vqLTK2131A7c4/XOTNd0j6l13Qbe1Bl6ikQIv\nxjo3V5nx3+4LzqHAd29AQdPP5hTDVtcboNm9ZgnFc2x0Jv5dBeVOqoZ8iZTSMEta\nY8qfQMPSs0a70V9vPCOrtH4=\n-----END PRIVATE KEY-----\n"  
}

global.thread = 2;
