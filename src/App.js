import React from 'react';

import WithMoveValidation from "./integrations/moveValidation";



const App = () => {


    return (
        <div style={boardsContainer}>

            <WithMoveValidation />
        </div>
    )
  }
  
  export default App;

  const boardsContainer = {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    flexWrap: "wrap",
    width: "100vw",
    marginTop: 30,
    marginBottom: 50
  };