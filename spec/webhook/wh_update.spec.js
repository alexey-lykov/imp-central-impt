// MIT License
//
// Copyright 2018 Electric Imp
//
// SPDX-License-Identifier: MIT
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the Software), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED AS IS, WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
// EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
// OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.

'use strict';

require('jasmine-expect');
const config = require('../config');
const ImptTestHelper = require('../ImptTestHelper');
const MessageHelper = require('../MessageHelper');
const Identifier = require('../../lib/util/Identifier');
const Util = require('util');
const UserInterractor = require('../../lib/util/UserInteractor');

const PRODUCT_NAME = `__impt_wh_product${config.suffix}`;
const DG_NAME = `__impt_wh_device_group${config.suffix}`;
const DG_NAME_2 = `__impt_wh_device_group_2${config.suffix}`;
const WH_URL = `http://example.com/wu/${config.suffix}`;
const WH_URL_2 = `http://example.com/wu2/${config.suffix}`;

// Test suite for 'impt webhook update command.
// Runs 'impt webhook update' command with different combinations of options,
ImptTestHelper.OUTPUT_MODES.forEach((outputMode) => {
    describe(`impt webhook update test suite (output: ${outputMode ? outputMode : 'default'}) >`, () => {
        let dg_id = null;
        let wh_id = null;

        beforeAll((done) => {
            ImptTestHelper.init().
                then(_testSuiteCleanUp).
                then(_testSuiteInit).
                then(done).
                catch(error => done.fail(error));
        }, ImptTestHelper.TIMEOUT);

        afterAll((done) => {
            _testSuiteCleanUp().
                then(ImptTestHelper.cleanUp).
                then(done).
                catch(error => done.fail(error));
        }, ImptTestHelper.TIMEOUT);

        // delete all entities using in impt webhook update  test suite
        function _testSuiteCleanUp() {
            return ImptTestHelper.runCommand(`impt product delete --product ${PRODUCT_NAME} --force --confirmed`, ImptTestHelper.emptyCheck).
                then(() => ImptTestHelper.runCommand(`impt dg delete --dg ${DG_NAME_2} -f `, ImptTestHelper.emptyCheck)).
                then(() => ImptTestHelper.runCommand(`impt webhook delete --wh ${wh_id} -q`, ImptTestHelper.emptyCheck));
        }

        // prepare test environment for impt webhook update test suite
        function _testSuiteInit() {
            return ImptTestHelper.runCommand(`impt product create --name ${PRODUCT_NAME}`, ImptTestHelper.emptyCheck).
                then(() => ImptTestHelper.runCommand(`impt dg create --name ${DG_NAME} -p ${PRODUCT_NAME} `, (commandOut) => {
                    dg_id = ImptTestHelper.parseId(commandOut);
                    if (!dg_id) fail("TestSuitInit error: Failed to create device group");
                    ImptTestHelper.emptyCheck(commandOut);
                })).
                then(() => ImptTestHelper.runCommand(`impt webhook create --dg ${DG_NAME} --url ${WH_URL} --event deployment --mime json `, (commandOut) => {
                    wh_id = ImptTestHelper.parseId(commandOut);
                    if (!wh_id) fail("TestSuitInit error: Failed to create webhook");
                    ImptTestHelper.emptyCheck(commandOut);
                }));
        }

        // check 'webhook successfully updated' output message 
        function _checkSuccessUpdateWebhookMessage(commandOut, webhookId) {
            ImptTestHelper.checkOutputMessage(`${outputMode}`, commandOut,
                Util.format(`${UserInterractor.MESSAGES.ENTITY_UPDATED}`,
                    `${Identifier.ENTITY_TYPE.TYPE_WEBHOOK} "${webhookId}"`)
            );
        }

        // check command`s result by exec webhook info command
        function _checkWebhookInfo(expectInfo = {}) {
            return ImptTestHelper.runCommand(`impt webhook info --wh ${expectInfo.id ? expectInfo.id : wh_id} -z json`, (commandOut) => {
                const json = JSON.parse(commandOut.output);
                expect(json.Webhook).toBeDefined;
                expect(json.Webhook.id).toBe(expectInfo.id ? expectInfo.id : wh_id);
                expect(json.Webhook.url).toBe(expectInfo.url ? expectInfo.url : WH_URL);
                expect(json.Webhook.event).toBe(expectInfo.deployment ? expectInfo.deployment : 'deployment');
                expect(json.Webhook.content_type).toBe(expectInfo.mime ? expectInfo.mime : 'json');
                expect(json.Webhook['Device Group'].id).toBe(expectInfo.dg_id ? expectInfo.dg_id : dg_id);
                expect(json.Webhook['Device Group'].name).toBe(expectInfo.dg_name ? expectInfo.dg_name : DG_NAME);
                ImptTestHelper.checkSuccessStatus(commandOut);
            });
        }

        it('webhook update without url and mime', (done) => {
            ImptTestHelper.runCommand(`impt webhook update --wh ${wh_id} ${outputMode}`, (commandOut) => {
                _checkSuccessUpdateWebhookMessage(commandOut, wh_id);
                ImptTestHelper.checkSuccessStatus(commandOut);
            }).
                then(_checkWebhookInfo).
                then(done).
                catch(error => done.fail(error));
        });

        it('webhook update url and mime', (done) => {
            ImptTestHelper.runCommand(`impt webhook update --wh ${wh_id} --url ${WH_URL_2} --mime urlencoded ${outputMode}`, (commandOut) => {
                _checkSuccessUpdateWebhookMessage(commandOut, wh_id);
                ImptTestHelper.checkSuccessStatus(commandOut);
            }).
                then(() => { _checkWebhookInfo({ url: WH_URL_2, mime: 'urlencoded' }); }).
                then(done).
                catch(error => done.fail(error));
        });

        it('update not exist webhook', (done) => {
            ImptTestHelper.runCommand(`impt webhook update --wh not-exist-webhook --url ${WH_URL_2} ${outputMode}`, (commandOut) => {
                MessageHelper.checkEntityNotFoundError(commandOut, Identifier.ENTITY_TYPE.TYPE_WEBHOOK, 'not-exist-webhook');
                ImptTestHelper.checkFailStatus(commandOut);
            }).
                then(done).
                catch(error => done.fail(error));
        });
    });
});
