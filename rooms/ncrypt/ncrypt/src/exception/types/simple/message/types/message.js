
/* nCrypt - Javascript cryptography made simple
 * Copyright (C) 2015 photophobia
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * */

/**
 * @namespace nCrypt.exception.types.simple.message.message
 * */
var message = {};

message.invalidArgument = function(message){
    this.name = "nCrypt.exception.types.simple.message.message.invalidArgument";
    this.message = message || "Invalid argument.";
};
message.invalidArgument.prototype = new Error();
message.invalidArgument.prototype.constructor = message.invalidArgument;

message.malformedInput = function(message){
    this.name = "nCrypt.exception.types.simple.message.message.malformedInput";
    this.message = message || "Malformed input.";
};
message.malformedInput.prototype = new Error();
message.malformedInput.prototype.constructor = message.malformedInput;

message.invalidMessageType = function(message){
    this.name = "nCrypt.exception.types.simple.message.message."+
                "invalidMessageType";
    this.message = message || "Invalid message type.";
};
message.invalidMessageType.prototype = new Error();
message.invalidMessageType.prototype.constructor = message.invalidMessageType;

message.invalidMessageContent = function(message){
    this.name = "nCrypt.exception.types.simple.message.message."+
                "invalidMessageContent";
    this.message = message || "Invalid message content.";
};
message.invalidMessageContent.prototype = new Error();
message.invalidMessageContent.prototype.constructor = 
    message.invalidMessageContent;
    
message.invalidReceiverArray = function(message){
    this.name = "nCrypt.exception.types.simple.message.message."+
                "invalidReceiverArray";
    this.message = message || "Invalid message receiver symkey array.";
};
message.invalidReceiverArray.prototype = new Error();
message.invalidReceiverArray.prototype.constructor = 
    message.invalidReceiverArray;

message.malformedMessage = function(message){
    this.name = 
        "nCrypt.exception.types.simple.message.message.malformedMessage";
    this.message = message || "Malformed input.";
};
message.malformedMessage.prototype = new Error();
message.malformedMessage.prototype.constructor = message.malformedMessage;

message.messageIsNotEncrypted = function(message){
    this.name = 
        "nCrypt.exception.types.simple.message.message.messageIsNotEncrypted";
    this.message = message || "Message is not encrypted.";
};
message.messageIsNotEncrypted.prototype = new Error();
message.messageIsNotEncrypted.prototype.constructor = message.
    messageIsNotEncrypted;

message.messageIsNotSigned = function(message){
    this.name = 
        "nCrypt.exception.types.simple.message.message.messageIsNotSigned";
    this.message = message || "Message is not signed.";
};
message.messageIsNotSigned.prototype = new Error();
message.messageIsNotSigned.prototype.constructor = message.
    messageIsNotSigned;

message.missingSenderKeyset = function(message){
    this.name = 
        "nCrypt.exception.types.simple.message.message.missingSenderKeyset";
    this.message = message || "Missing sender keyset. (Required for "
                              "DH like shared secret derivation and "+
                              "signature validation.";
};
message.missingSenderKeyset.prototype = new Error();
message.missingSenderKeyset.prototype.constructor = message.missingSenderKeyset;

message.missingEncryptionKeypair = function(message){
    this.name = 
    "nCrypt.exception.types.simple.message.message.missingEncryptionKeypair";
    this.message = message || "Missing encryption keypair in keyset.";
};
message.missingEncryptionKeypair.prototype = new Error();
message.missingEncryptionKeypair.prototype.constructor = 
    message.missingEncryptionKeypair;

message.missingSigningKeypair = function(message){
    this.name = 
    "nCrypt.exception.types.simple.message.message.missingSigningKeypair";
    this.message = message || "Missing signing keypair in keyset.";
};
message.missingSigningKeypair.prototype = new Error();
message.missingSigningKeypair.prototype.constructor = 
    message.missingSigningKeypair;

message.cannotDecryptSymkey = function(message){
    this.name = 
        "nCrypt.exception.types.simple.message.message.cannotDecryptSymkey";
    this.message = message || "Cannot decrypt symmetric key using "
                              "shared secret.";
};
message.cannotDecryptSymkey.prototype = new Error();
message.cannotDecryptSymkey.prototype.constructor = message.cannotDecryptSymkey;

module.exports = message;
