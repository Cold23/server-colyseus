import http from 'http'
import express from 'express'
import cors from 'cors'
import { Server } from 'colyseus'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { MyRoom } from './rooms/MyRoom'
const port = Number(process.env.PORT || 2567)
const app = express()

app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
  }),
})
gameServer.simulateLatency(60)
gameServer.define('general', MyRoom)
gameServer.listen(port)
console.log(`Listening on ws://localhost:${port}`)
//
