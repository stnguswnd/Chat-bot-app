import { createBrowserRouter } from "react-router-dom";
import RootRayout from "../layout/RootRayout";
import PrivateLayout from "../layout/PrivateLayout";
import Home from "../Page/Home";
import Chat from "../Page/Chat";
import MemoList from "../Page/MemoList";
import Login from "../Page/Login";
import Profile from "../Page/Profile"; 
import MemoList2 from "../Page/MemoList2";
import MemoList3 from "../Page/MemoList3";
import Chat2 from "../Page/Chat2";
import Signup from "../Page/Signup";

const router = createBrowserRouter([
  {
    path: "/",
    Component: RootRayout,
    children: [
      {
        path: "/",
        Component: Home,
      },
      {
        path: "/login",
        Component: Login,
      },
      {
        path: "/signup",
        Component: Signup,
      },
      {
        path: "/",
        Component: PrivateLayout,
        children: [
          {
            path: "/chat",
            Component: Chat,
          },
          {
            path: "/chat2",
            Component: Chat2,
          },
          {
            path: "/memo-list",
            Component: MemoList,
          },
          {
            path: "/profile",
            Component: Profile,
          },
          {
            path: "/memo-list2",
            Component: MemoList2,

          },
          {
            path: "/memo-list3",
            Component: MemoList3,
          }
        ],
      },
    ],
  },
]);

export default router;
