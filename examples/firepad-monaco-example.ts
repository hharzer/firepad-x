import * as monaco from "monaco-editor";
import * as firebase from "firebase/app";
import "firebase/database";
import "firebase/firestore";
import { v4 as uuid } from "uuid";
import { Utils } from "../src/utils";

import * as Firepad from "../src";

const getExampleRef = function (): firebase.database.Reference {
  let ref = firebase.database().ref();

  const hash = window.location.hash.replace(/#/g, "");
  if (hash) {
    ref = ref.child(hash);
  } else {
    ref = ref.push(); // generate unique location.
    window.location.replace(window.location + "#" + ref.key); // add it as a hash to the URL.
  }

  console.log("Firebase data: ", ref.toString());
  return ref;
};

const init = function (): void {
  // Initialize Firebase.
  console.log(process.env.FIREBASE_CONFIG);
  firebase.initializeApp(process.env.FIREBASE_CONFIG);

  // Get Firebase Database reference.
  const firepadRef = getExampleRef();

  const userId: UserIDType = uuid();
  const userColor: string = Utils.colorFromUserId(userId.toString());
  const userName: string = `Anonymous ${Math.floor(Math.random() * 100)}`;
  const databaseAdapter = new Firepad.FirestoreAdapter(
    firebase.firestore(),
    userId,
    userColor,
    userName
  );

  // Create Monaco and firepad.
  const editor = monaco.editor.create(document.getElementById("firepad"), {
    language: "javascript",
    fontSize: 18,
    theme: "vs-dark",
    // @ts-ignore
    trimAutoWhitespace: false,
  });

  const editorAdapter = new Firepad.MonacoAdapter(editor, false);
  debugger;
  const firestoreFirepad = new Firepad.Firepad(databaseAdapter, editorAdapter, {
    userId,
    userColor,
    userName,
    defaultText: `// typescript Editing with Firepad!
function go() {
  var message = "Hello, Firestore.";
  console.log(message);
}
`,
  });

  //   const firepad = Firepad.fromMonaco(firepadRef, editor, {
  //     userName: `Anonymous ${Math.floor(Math.random() * 100)}`,
  //     defaultText: `// typescript Editing with Firepad!
  // function go() {
  //   var message = "Hello, world.";
  //   console.log(message);
  // }
  // `,
  //   });

  window["firepad"] = firestoreFirepad;
  window["editor"] = editor;

  window.addEventListener("resize", function () {
    editor.layout();
  });
};

// Initialize the editor in non-blocking way
setTimeout(init);

// Hot Module Replacement Logic
declare var module: NodeModule & {
  hot: { accept(path: string, callback: Function): void };
};

if (module.hot) {
  const onHotReload = function () {
    console.clear();
    console.log("Changes detected, recreating Firepad!");

    const Firepad = require("../src/index.ts");

    // Get Editor and Firepad instance
    const editor: monaco.editor.IStandaloneCodeEditor = window["editor"];
    const firepad: Firepad.Firepad = window["firepad"];

    // Get Constructor Options
    const firepadRef: firebase.database.Reference = getExampleRef();
    const userId: string | number = firepad.getConfiguration("userId");
    const userName: string = firepad.getConfiguration("userName");
    const userColor: string = firepad.getConfiguration("userColor");
    const defaultText = firepad.getText();
    // Dispose previous connection
    firepad.dispose();

    // Create new connection
    const databaseAdapter = new Firepad.FirestoreAdapter(
      firebase.firestore(),
      userId,
      userColor,
      userName
    );

    const editorAdapter = new Firepad.MonacoAdapter(editor, false);
    const firestoreFirepad = new Firepad.Firepad(
      databaseAdapter,
      editorAdapter,
      {
        userId,
        userColor,
        userName,
        defaultText,
      }
    );
  };

  module.hot.accept("../src/index.ts", onHotReload);
}
