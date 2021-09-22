import * as firebase from "firebase/app";
import "firebase/database";
import "firebase/firestore";
import { IEventEmitter, EventEmitter, EventListener } from "./emitter";
import {
  UserIDType,
  IDatabaseAdapter,
  IDatabaseAdapterEvent,
  SendCursorCallbackType,
  SendOperationCallbackType,
  DatabaseAdapterCallbackType,
  DatabaseAdapterEvent as FirestoreAdapterEvent,
} from "./database-adapter";
import {
  ITextOperation,
  TextOperation,
  TextOperationType,
} from "./text-operation";

export class FirestoreAdapter implements IDatabaseAdapter {
  constructor(databaseRef, userId, userColor, userName) {
    this._databaseRef = databaseRef.collection("firepad");

    this.setUserColor(userColor);
    this.setUserName(userName);
    this.setUserId(userId);

    this._document = new TextOperation();

    this._emitter = new EventEmitter([
      FirestoreAdapterEvent.Acknowledge,
      FirestoreAdapterEvent.CursorChange,
      FirestoreAdapterEvent.Error,
      FirestoreAdapterEvent.Operation,
      FirestoreAdapterEvent.Ready,
      FirestoreAdapterEvent.Retry,
    ]);

    this.on(FirestoreAdapterEvent.CursorChange, (...args) => {
      console.log("cursor args: ", args);
    });

    this._init();
  }

  protected _init(): void {
    this.on(FirestoreAdapterEvent.Ready, () => {
      this._monitorCursors();
    });

    setTimeout(() => {
      this._emitter?.trigger(FirestoreAdapterEvent.Ready, true);
    }, 1);
  }

  protected _monitorCursors(): void {
    const userRef = this._databaseRef.doc("fillerDocument").collection("users");
    // Set up listener for change in user doc
    userRef.onSnapshot((cursorSnapshot) => {
      cursorSnapshot.docChanges().forEach((cursor) => {
        if (!this.isCurrentUser(cursor.doc.id)) {
          const userData = cursor.doc.data();
          if (["added", "modified"].includes(cursor.type)) {
            this._emitter?.trigger(
              FirestoreAdapterEvent.CursorChange,
              cursor.doc.id,
              userData.cursor,
              userData.color,
              userData.userName
            );
            console.log("Added: ", cursor.doc.data());
          } else {
            this._emitter?.trigger(
              FirestoreAdapterEvent.CursorChange,
              cursor.doc.id,
              null
            );
            console.log("Removed: ", cursor.doc.data());
          }
        }
      });
    });
  }

  dispose(): void {
    console.log("disposing");
  }

  setUserId(userId) {
    this._userId = userId;
    return;
  }

  setUserName(userName) {
    this._userName = userName;
    return;
  }

  setUserColor(userColor) {
    this._userColor = userColor;
    return;
  }

  on(event, listener) {
    return this._emitter?.on(event, listener);
  }

  off(event, listener) {
    return this._emitter?.on(event, listener);
  }

  sendCursor(cursorDetails, callback) {
    if (!cursorDetails) {
      this._databaseRef
        .doc("fillerDocument")
        .collection("users")
        .doc(this._userId)
        .delete();
      return;
    }
    this._databaseRef
      .doc("fillerDocument")
      .collection("users")
      .doc(this._userId)
      .set(
        {
          userName: this._userName,
          color: this._userColor,
          cursor: {
            position: cursorDetails?._position,
            selectionEnd: cursorDetails?._selectionEnd,
          },
        },
        { merge: true }
      );
    return;
  }

  isHistoryEmpty() {
    return true;
  }

  getDocument() {
    return;
  }

  isCurrentUser(clientId) {
    return this._userId == clientId;
  }

  sendOperation(operaation, callback) {
    return;
  }

  registerCallbacks(callbacks): void {
    Object.entries(callbacks).forEach(([event, listener]) => {
      this.on(event as FirestoreAdapterEvent, listener as any);
    });
  }
}
