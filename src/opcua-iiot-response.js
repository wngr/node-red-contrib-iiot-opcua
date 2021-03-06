/*
 The BSD 3-Clause License

 Copyright 2017 - Klaus Landsdorf (http://bianco-royal.de/)
 All rights reserved.
 node-red-contrib-iiot-opcua
 */
'use strict'

/**
 * Response analyser Node-RED node for OPC UA IIoT nodes.
 *
 * @param RED
 */
module.exports = function (RED) {
  // SOURCE-MAP-REQUIRED
  let coreResponse = require('./core/opcua-iiot-core-response')
  const EMPTY_LIST = 0

  function OPCUAIIoTResponse (config) {
    RED.nodes.createNode(this, config)
    this.name = config.name
    this.showStatusActivities = config.showStatusActivities
    this.showErrors = config.showErrors

    let node = this

    node.status({
      fill: 'blue',
      shape: 'ring',
      text: '...'
    })

    node.on('input', function (msg) {
      coreResponse.internalDebugLog(msg)
      coreResponse.internalDebugLog(JSON.stringify(msg))

      try {
        if (msg.nodetype) {
          switch (msg.nodetype) {
            case 'read':
              node.analyzeReadResults(msg)
              break

            case 'write':
              node.analyzeWriteResults(msg)
              break

            case 'listen':
              node.analyzeListenerResults(msg)
              break

            case 'method':
              node.analyzeMethodResults(msg)
              break

            default:
              coreResponse.internalDebugLog('unknown node type: '.orange + JSON.stringify(msg.nodetype))
              if (msg && msg.payload) {
                node.handlePayloadStatusCode(msg)
              }
          }
        }
      } catch (err) {
        coreResponse.internalDebugLog(err)
        if (node.showErrors) {
          node.error(err, msg)
        }
      }

      node.send(msg)
    })

    node.analyzeReadResults = function (msg) {
      switch (msg.readtype) {
        case 'AllAttributes':
          node.handlePayloadStatusCode(msg) // TODO: do more
          break

        case 'VariableValue':
          node.handlePayloadStatusCode(msg) // TODO: do less
          break

        case 'Meta':
          node.setNodeStatus([0, 0, 0], 'None')
          break

        default:
          node.handlePayloadStatusCode(msg) // TODO: do default
          break
      }
    }

    node.analyzeListenerResults = function (msg) {
      switch (msg.readtype) {
        case 'subscribe':
          node.analyzeSubscribeResultStatus(msg)
          break

        case 'event':
          node.analyzeEventResultStatus(msg)
          break

        default:
          break
      }
    }

    node.analyzeMethodResults = function (msg) {
      switch (msg.methodType) {
        case 'basic':
          node.handlePayloadStatusCode(msg)
          break

        case 'complex':
          node.handlePayloadStatusCode(msg)
          break

        default:
          break
      }
    }

    node.setNodeStatus = function (entryStatus, informationText) {
      let fillColor = 'green'

      if (entryStatus[2] > EMPTY_LIST) {
        fillColor = 'yellow'
      }

      if (entryStatus[1] > EMPTY_LIST) {
        fillColor = 'red'
      }

      node.status({
        fill: fillColor,
        shape: 'dot',
        text: informationText
      })
    }

    node.analyzeWriteResults = function (msg) {
      let entryStatus = node.handlePayloadArrayOfStatusCodes(msg)
      msg.entryStatus = entryStatus
      node.setNodeStatus(entryStatus, 'Good:' + entryStatus[0] + ' Bad:' + entryStatus[1] + ' Other:' + entryStatus[2])
    }

    node.analyzeSubscribeResultStatus = function (msg) {
      node.handlePayloadStatusCode(msg)
    }

    node.analyzeEventResultStatus = function (msg) {
      node.handlePayloadStatusCode(msg)
    }

    node.handlePayloadStatusCode = function (msg) {
      let entryStatus = [0, 0, 0]

      if (msg.payload.length) {
        entryStatus = node.handlePayloadArrayOfObjects(msg)
      } else {
        entryStatus = node.handlePayloadObject(msg)
      }

      msg.entryStatus = entryStatus

      node.setNodeStatus(entryStatus, 'Good:' + entryStatus[0] + ' Bad:' + entryStatus[1] + ' Other:' + entryStatus[2])
    }

    node.handlePayloadArrayOfObjects = function (msg) {
      let entry = null
      let entryStatus = [0, 0, 0]

      for (entry of msg.payload) {
        if (entry.statusCode && entry.statusCode.name) {
          switch (entry.statusCode.name) {
            case 'Good':
              entryStatus[0] += 1
              break
            case 'Bad':
              entryStatus[1] += 1
              break
            default:
              if (entry.statusCode.name.indexOf('Good') > -1) {
                entryStatus[0] += 1
              } else if (entry.statusCode.name.indexOf('Bad') > -1) {
                entryStatus[1] += 1
              } else {
                coreResponse.internalDebugLog('unknown status name: '.orange + JSON.stringify(entry.statusCode.name))
                entryStatus[2] += 1
              }
          }
        }
      }

      return entryStatus
    }

    node.handlePayloadObject = function (msg) {
      let entryStatus = [0, 0, 0]

      if (msg.payload && msg.payload.statusCode) {
        if (msg.payload.statusCode.name) {
          switch (msg.payload.statusCode.name) {
            case 'Good':
              entryStatus[0] += 1
              break
            case 'Bad':
              entryStatus[1] += 1
              break
            default:
              if (msg.result.statusCode.name.indexOf('Good') > -1) {
                entryStatus[0] += 1
              } else if (msg.result.statusCode.name.indexOf('Bad') > -1) {
                entryStatus[1] += 1
              } else {
                coreResponse.internalDebugLog('unknown status name: '.orange + JSON.stringify(msg.result.statusCode.name))
                entryStatus[2] += 1
              }
          }
        }
      }
      return entryStatus
    }

    node.handlePayloadArrayOfStatusCodes = function (msg) {
      let entry = null
      let entryStatus = [0, 0, 0]

      for (entry of msg.payload) {
        if (entry && entry.name) {
          switch (entry.name) {
            case 'Good':
              entryStatus[0] += 1
              break
            case 'Bad':
              entryStatus[1] += 1
              break
            default:
              if (entry.name.indexOf('Good') > -1) {
                entryStatus[0] += 1
              } else if (entry.name.indexOf('Bad') > -1) {
                entryStatus[1] += 1
              } else {
                coreResponse.internalDebugLog('unknown status name: '.orange + JSON.stringify(entry.name))
                entryStatus[2] += 1
              }
          }
        }
      }

      return entryStatus
    }
  }

  RED.nodes.registerType('OPCUA-IIoT-Response', OPCUAIIoTResponse)

// StatusCodes via REST anbieten
}
