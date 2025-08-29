// src/components/common/Loading.js
import React from 'react';

const Loading = ({ message = "A carregar..." }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{message}</p>
        <p className="text-sm text-gray-400 mt-2">A equipa está a aquecer...</p>
      </div>
    </div>
  );
};

export default Loading;