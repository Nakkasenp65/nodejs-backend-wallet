export function flexMessage(mode: any, line_user_id: any, payload?: {}): {
    to: any;
    messages: {
        type: string;
        altText: string;
        contents: {
            type: string;
            size: string;
            hero: {
                type: string;
                layout: string;
                contents: {
                    type: string;
                    size: string;
                    animated: boolean;
                    url: string;
                    aspectRatio: string;
                    aspectMode: string;
                }[];
                justifyContent: string;
            };
            body: {
                type: string;
                layout: string;
                contents: ({
                    type: string;
                    layout: string;
                    contents: ({
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            weight: string;
                            flex: number;
                            url?: undefined;
                            size?: undefined;
                            animated?: undefined;
                            offsetBottom?: undefined;
                            offsetStart?: undefined;
                        } | {
                            type: string;
                            url: string;
                            size: string;
                            animated: boolean;
                            offsetBottom: string;
                            offsetStart: string;
                            text?: undefined;
                            weight?: undefined;
                            flex?: undefined;
                        })[];
                    } | {
                        type: string;
                        layout?: undefined;
                        contents?: undefined;
                    } | {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            weight: string;
                            color: string;
                            align?: undefined;
                            offsetTop?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            offsetTop: string;
                            flex?: undefined;
                            weight?: undefined;
                            color?: undefined;
                        })[];
                    } | {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            color: string;
                            weight: string;
                            align?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            flex?: undefined;
                            color?: undefined;
                            weight?: undefined;
                        })[];
                    } | {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            weight: string;
                            color: string;
                            align?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            color: string;
                            weight: string;
                            flex?: undefined;
                        })[];
                    })[];
                    margin?: undefined;
                    action?: undefined;
                    height?: undefined;
                    style?: undefined;
                    color?: undefined;
                    offsetTop?: undefined;
                } | {
                    type: string;
                    margin: string;
                    layout?: undefined;
                    contents?: undefined;
                    action?: undefined;
                    height?: undefined;
                    style?: undefined;
                    color?: undefined;
                    offsetTop?: undefined;
                } | {
                    type: string;
                    action: {
                        type: string;
                        label: string;
                        uri: string;
                    };
                    height: string;
                    style: string;
                    color: string;
                    offsetTop: string;
                    layout?: undefined;
                    contents?: undefined;
                    margin?: undefined;
                })[];
            };
        };
    }[];
} | {
    to: any;
    messages: {
        type: string;
        altText: string;
        contents: {
            type: string;
            size: string;
            hero: {
                type: string;
                layout: string;
                contents: {
                    type: string;
                    size: string;
                    animated: boolean;
                    url: string;
                    aspectRatio: string;
                    aspectMode: string;
                }[];
                justifyContent: string;
            };
            body: {
                type: string;
                layout: string;
                contents: ({
                    type: string;
                    layout: string;
                    contents: ({
                        type: string;
                        layout: string;
                        contents: {
                            type: string;
                            text: string;
                            size: string;
                        }[];
                    } | {
                        type: string;
                        layout: string;
                        contents: {
                            type: string;
                            text: string;
                            offsetTop: string;
                            align: string;
                            weight: string;
                            size: string;
                            color: string;
                        }[];
                    })[];
                    margin?: undefined;
                    offsetTop?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    margin: string;
                    layout?: undefined;
                    contents?: undefined;
                    offsetTop?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: ({
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            align?: undefined;
                            offsetTop?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            offsetTop: string;
                            flex?: undefined;
                        })[];
                    } | {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            url: string;
                            size: string;
                            align: string;
                            offsetEnd: string;
                            offsetTop: string;
                            text?: undefined;
                            flex?: undefined;
                            offsetBottom?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            flex: number;
                            offsetBottom: string;
                            url?: undefined;
                            offsetEnd?: undefined;
                            offsetTop?: undefined;
                        })[];
                    } | {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            align?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            flex?: undefined;
                        })[];
                    })[];
                    offsetTop: string;
                    margin?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            align?: undefined;
                            color?: undefined;
                            weight?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            color: string;
                            weight: string;
                            flex?: undefined;
                        })[];
                    }[];
                    margin?: undefined;
                    offsetTop?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: {
                        type: string;
                        action: {
                            type: string;
                            label: string;
                            uri: string;
                        };
                        height: string;
                        style: string;
                    }[];
                    offsetTop: string;
                    margin?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: ({
                        type: string;
                        url: string;
                        flex: number;
                        gravity: string;
                        size: string;
                        animated: boolean;
                        text?: undefined;
                        color?: undefined;
                        weight?: undefined;
                        wrap?: undefined;
                        offsetStart?: undefined;
                    } | {
                        type: string;
                        text: string;
                        flex: number;
                        size: string;
                        color: string;
                        weight: string;
                        gravity: string;
                        wrap: boolean;
                        offsetStart: string;
                        url?: undefined;
                        animated?: undefined;
                    } | {
                        type: string;
                        url: string;
                        flex: number;
                        gravity: string;
                        size: string;
                        animated?: undefined;
                        text?: undefined;
                        color?: undefined;
                        weight?: undefined;
                        wrap?: undefined;
                        offsetStart?: undefined;
                    })[];
                    spacing: string;
                    action: {
                        type: string;
                        label: string;
                        text: string;
                    };
                    justifyContent: string;
                    alignItems: string;
                    offsetTop: string;
                    margin?: undefined;
                })[];
                paddingAll: string;
            };
        };
    }[];
} | {
    to: any;
    messages: {
        type: string;
        altText: string;
        contents: {
            type: string;
            size: string;
            hero: {
                type: string;
                layout: string;
                contents: {
                    type: string;
                    size: string;
                    animated: boolean;
                    url: string;
                    aspectRatio: string;
                    aspectMode: string;
                }[];
                justifyContent: string;
            };
            body: {
                type: string;
                layout: string;
                contents: ({
                    type: string;
                    layout: string;
                    contents: ({
                        type: string;
                        layout: string;
                        contents: {
                            type: string;
                            text: string;
                            size: string;
                        }[];
                    } | {
                        type: string;
                        layout: string;
                        contents: {
                            type: string;
                            text: string;
                            offsetTop: string;
                            align: string;
                            weight: string;
                            size: string;
                            color: string;
                        }[];
                    })[];
                    margin?: undefined;
                    offsetTop?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    margin: string;
                    layout?: undefined;
                    contents?: undefined;
                    offsetTop?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: ({
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            align?: undefined;
                            offsetTop?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            offsetTop: string;
                            flex?: undefined;
                        })[];
                    } | {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            url: string;
                            size: string;
                            align: string;
                            offsetEnd: string;
                            offsetTop: string;
                            text?: undefined;
                            offsetBottom?: undefined;
                            flex?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            offsetBottom: string;
                            flex: number;
                            url?: undefined;
                            offsetEnd?: undefined;
                            offsetTop?: undefined;
                        })[];
                    })[];
                    offsetTop: string;
                    margin?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            align?: undefined;
                            color?: undefined;
                            weight?: undefined;
                            offsetTop?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            color: string;
                            weight: string;
                            offsetTop: string;
                            flex?: undefined;
                        })[];
                    }[];
                    margin?: undefined;
                    offsetTop?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: {
                        type: string;
                        action: {
                            type: string;
                            label: string;
                            uri: string;
                        };
                        height: string;
                        style: string;
                        color: string;
                    }[];
                    offsetTop: string;
                    margin?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: ({
                        type: string;
                        url: string;
                        flex: number;
                        gravity: string;
                        size: string;
                        animated: boolean;
                        text?: undefined;
                        color?: undefined;
                        weight?: undefined;
                        wrap?: undefined;
                        offsetStart?: undefined;
                    } | {
                        type: string;
                        text: string;
                        flex: number;
                        size: string;
                        color: string;
                        weight: string;
                        gravity: string;
                        wrap: boolean;
                        offsetStart: string;
                        url?: undefined;
                        animated?: undefined;
                    } | {
                        type: string;
                        url: string;
                        flex: number;
                        gravity: string;
                        size: string;
                        animated?: undefined;
                        text?: undefined;
                        color?: undefined;
                        weight?: undefined;
                        wrap?: undefined;
                        offsetStart?: undefined;
                    })[];
                    spacing: string;
                    action: {
                        type: string;
                        label: string;
                        text: string;
                    };
                    justifyContent: string;
                    alignItems: string;
                    offsetTop: string;
                    margin?: undefined;
                })[];
                paddingAll: string;
            };
        };
    }[];
} | {
    to: string;
    messages: {
        type: string;
        altText: string;
        contents: {
            type: string;
            size: string;
            hero: {
                type: string;
                layout: string;
                contents: {
                    type: string;
                    size: string;
                    animated: boolean;
                    url: string;
                    aspectRatio: string;
                    aspectMode: string;
                }[];
                justifyContent: string;
            };
            body: {
                type: string;
                layout: string;
                contents: ({
                    type: string;
                    layout: string;
                    contents: ({
                        type: string;
                        layout: string;
                        contents: {
                            type: string;
                            text: string;
                            size: string;
                        }[];
                    } | {
                        type: string;
                        layout: string;
                        contents: {
                            type: string;
                            text: string;
                            offsetTop: string;
                            align: string;
                            weight: string;
                            size: string;
                            color: string;
                        }[];
                    })[];
                    margin?: undefined;
                    offsetTop?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    margin: string;
                    layout?: undefined;
                    contents?: undefined;
                    offsetTop?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: ({
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            align?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            flex?: undefined;
                        })[];
                        margin?: undefined;
                    } | {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            align?: undefined;
                            offsetTop?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            offsetTop: string;
                            flex?: undefined;
                        })[];
                        margin?: undefined;
                    } | {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            align?: undefined;
                            offsetTop?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            offsetTop: string;
                            flex?: undefined;
                        })[];
                        margin: string;
                    })[];
                    offsetTop: string;
                    margin?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            align?: undefined;
                            color?: undefined;
                            weight?: undefined;
                            offsetTop?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            color: string;
                            weight: string;
                            offsetTop: string;
                            flex?: undefined;
                        })[];
                    }[];
                    margin: string;
                    offsetTop?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: {
                        type: string;
                        action: {
                            type: string;
                            label: string;
                            uri: string;
                        };
                        height: string;
                        style: string;
                    }[];
                    offsetTop: string;
                    margin: string;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: ({
                        type: string;
                        url: string;
                        flex: number;
                        gravity: string;
                        size: string;
                        animated: boolean;
                        text?: undefined;
                        color?: undefined;
                        weight?: undefined;
                        wrap?: undefined;
                        offsetStart?: undefined;
                    } | {
                        type: string;
                        text: string;
                        flex: number;
                        size: string;
                        color: string;
                        weight: string;
                        gravity: string;
                        wrap: boolean;
                        offsetStart: string;
                        url?: undefined;
                        animated?: undefined;
                    } | {
                        type: string;
                        url: string;
                        flex: number;
                        gravity: string;
                        size: string;
                        animated?: undefined;
                        text?: undefined;
                        color?: undefined;
                        weight?: undefined;
                        wrap?: undefined;
                        offsetStart?: undefined;
                    })[];
                    spacing: string;
                    action: {
                        type: string;
                        label: string;
                        text: string;
                    };
                    justifyContent: string;
                    alignItems: string;
                    offsetTop: string;
                    margin?: undefined;
                })[];
                paddingAll: string;
            };
        };
    }[];
} | {
    to: any;
    messages: {
        type: string;
        altText: string;
        contents: {
            type: string;
            size: string;
            hero: {
                type: string;
                layout: string;
                contents: {
                    type: string;
                    size: string;
                    animated: boolean;
                    url: string;
                    aspectRatio: string;
                    aspectMode: string;
                }[];
                justifyContent: string;
            };
            body: {
                type: string;
                layout: string;
                contents: ({
                    type: string;
                    layout: string;
                    contents: ({
                        type: string;
                        layout: string;
                        contents: {
                            type: string;
                            text: string;
                            size: string;
                        }[];
                    } | {
                        type: string;
                        layout: string;
                        contents: {
                            type: string;
                            text: string;
                            offsetTop: string;
                            align: string;
                            weight: string;
                            size: string;
                            color: string;
                        }[];
                    })[];
                    margin?: undefined;
                    offsetTop?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    margin: string;
                    layout?: undefined;
                    contents?: undefined;
                    offsetTop?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            align?: undefined;
                            offsetTop?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            offsetTop: string;
                            flex?: undefined;
                        })[];
                    }[];
                    offsetTop: string;
                    margin?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            align?: undefined;
                            color?: undefined;
                            weight?: undefined;
                            offsetTop?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            color: string;
                            weight: string;
                            offsetTop: string;
                            flex?: undefined;
                        })[];
                    }[];
                    margin: string;
                    offsetTop?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: {
                        type: string;
                        action: {
                            type: string;
                            label: string;
                            uri: string;
                        };
                        height: string;
                        style: string;
                        color: string;
                    }[];
                    offsetTop: string;
                    margin?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: ({
                        type: string;
                        url: string;
                        flex: number;
                        gravity: string;
                        size: string;
                        animated: boolean;
                        text?: undefined;
                        color?: undefined;
                        weight?: undefined;
                        wrap?: undefined;
                        offsetStart?: undefined;
                    } | {
                        type: string;
                        text: string;
                        flex: number;
                        size: string;
                        color: string;
                        weight: string;
                        gravity: string;
                        wrap: boolean;
                        offsetStart: string;
                        url?: undefined;
                        animated?: undefined;
                    } | {
                        type: string;
                        url: string;
                        flex: number;
                        gravity: string;
                        size: string;
                        animated?: undefined;
                        text?: undefined;
                        color?: undefined;
                        weight?: undefined;
                        wrap?: undefined;
                        offsetStart?: undefined;
                    })[];
                    spacing: string;
                    action: {
                        type: string;
                        label: string;
                        text: string;
                    };
                    justifyContent: string;
                    alignItems: string;
                    offsetTop: string;
                    margin?: undefined;
                })[];
                paddingAll: string;
            };
        };
    }[];
};
declare namespace _default {
    export { flexMessage };
    export { sendRegister };
    export { sendSender };
    export { sendReceiver };
}
export default _default;
declare function sendRegister(line_user_id: any, walletUniqueId: any, fullname: any, phone: any, balance: any): {
    to: any;
    messages: {
        type: string;
        altText: string;
        contents: {
            type: string;
            size: string;
            hero: {
                type: string;
                layout: string;
                contents: {
                    type: string;
                    size: string;
                    animated: boolean;
                    url: string;
                    aspectRatio: string;
                    aspectMode: string;
                }[];
                justifyContent: string;
            };
            body: {
                type: string;
                layout: string;
                contents: ({
                    type: string;
                    layout: string;
                    contents: ({
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            weight: string;
                            flex: number;
                            url?: undefined;
                            size?: undefined;
                            animated?: undefined;
                            offsetBottom?: undefined;
                            offsetStart?: undefined;
                        } | {
                            type: string;
                            url: string;
                            size: string;
                            animated: boolean;
                            offsetBottom: string;
                            offsetStart: string;
                            text?: undefined;
                            weight?: undefined;
                            flex?: undefined;
                        })[];
                    } | {
                        type: string;
                        layout?: undefined;
                        contents?: undefined;
                    } | {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            weight: string;
                            color: string;
                            align?: undefined;
                            offsetTop?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            offsetTop: string;
                            flex?: undefined;
                            weight?: undefined;
                            color?: undefined;
                        })[];
                    } | {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            color: string;
                            weight: string;
                            align?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            flex?: undefined;
                            color?: undefined;
                            weight?: undefined;
                        })[];
                    } | {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            weight: string;
                            color: string;
                            align?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            color: string;
                            weight: string;
                            flex?: undefined;
                        })[];
                    })[];
                    margin?: undefined;
                    action?: undefined;
                    height?: undefined;
                    style?: undefined;
                    color?: undefined;
                    offsetTop?: undefined;
                } | {
                    type: string;
                    margin: string;
                    layout?: undefined;
                    contents?: undefined;
                    action?: undefined;
                    height?: undefined;
                    style?: undefined;
                    color?: undefined;
                    offsetTop?: undefined;
                } | {
                    type: string;
                    action: {
                        type: string;
                        label: string;
                        uri: any;
                    };
                    height: string;
                    style: string;
                    color: string;
                    offsetTop: string;
                    layout?: undefined;
                    contents?: undefined;
                    margin?: undefined;
                })[];
            };
        };
    }[];
};
declare function sendSender(line_user_id: any, senderWalletUniqueId: any, receiverWalletUniqueId: any, liffUrlHistory: any, formattedAmount: any, formattedDate: any, formattedBalance: any): {
    to: any;
    messages: {
        type: string;
        altText: string;
        contents: {
            type: string;
            size: string;
            hero: {
                type: string;
                layout: string;
                contents: {
                    type: string;
                    size: string;
                    animated: boolean;
                    url: string;
                    aspectRatio: string;
                    aspectMode: string;
                }[];
                justifyContent: string;
            };
            body: {
                type: string;
                layout: string;
                contents: ({
                    type: string;
                    layout: string;
                    contents: ({
                        type: string;
                        layout: string;
                        contents: {
                            type: string;
                            text: string;
                            size: string;
                        }[];
                    } | {
                        type: string;
                        layout: string;
                        contents: {
                            type: string;
                            text: string;
                            offsetTop: string;
                            align: string;
                            weight: string;
                            size: string;
                            color: string;
                        }[];
                    })[];
                    margin?: undefined;
                    offsetTop?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    margin: string;
                    layout?: undefined;
                    contents?: undefined;
                    offsetTop?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            align?: undefined;
                            offsetTop?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            offsetTop: string;
                            flex?: undefined;
                        })[];
                    }[];
                    offsetTop: string;
                    margin?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            align?: undefined;
                            color?: undefined;
                            weight?: undefined;
                            offsetTop?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            color: string;
                            weight: string;
                            offsetTop: string;
                            flex?: undefined;
                        })[];
                    }[];
                    margin: string;
                    offsetTop?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: {
                        type: string;
                        action: {
                            type: string;
                            label: string;
                            uri: string;
                        };
                        height: string;
                        style: string;
                        color: string;
                    }[];
                    offsetTop: string;
                    margin?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: ({
                        type: string;
                        url: string;
                        flex: number;
                        gravity: string;
                        size: string;
                        animated: boolean;
                        text?: undefined;
                        color?: undefined;
                        weight?: undefined;
                        wrap?: undefined;
                        offsetStart?: undefined;
                    } | {
                        type: string;
                        text: string;
                        flex: number;
                        size: string;
                        color: string;
                        weight: string;
                        gravity: string;
                        wrap: boolean;
                        offsetStart: string;
                        url?: undefined;
                        animated?: undefined;
                    } | {
                        type: string;
                        url: string;
                        flex: number;
                        gravity: string;
                        size: string;
                        animated?: undefined;
                        text?: undefined;
                        color?: undefined;
                        weight?: undefined;
                        wrap?: undefined;
                        offsetStart?: undefined;
                    })[];
                    spacing: string;
                    action: {
                        type: string;
                        label: string;
                        text: string;
                    };
                    justifyContent: string;
                    alignItems: string;
                    offsetTop: string;
                    margin?: undefined;
                })[];
                paddingAll: string;
            };
        };
    }[];
};
declare function sendReceiver(line_user_id: any, senderWalletUniqueId: any, receiverWalletUniqueId: any, liffUrlHistory: any, formattedAmount: any, formattedDate: any, formattedBalance: any): {
    to: any;
    messages: {
        type: string;
        altText: string;
        contents: {
            type: string;
            size: string;
            hero: {
                type: string;
                layout: string;
                contents: {
                    type: string;
                    size: string;
                    animated: boolean;
                    url: string;
                    aspectRatio: string;
                    aspectMode: string;
                }[];
                justifyContent: string;
            };
            body: {
                type: string;
                layout: string;
                contents: ({
                    type: string;
                    layout: string;
                    contents: ({
                        type: string;
                        layout: string;
                        contents: {
                            type: string;
                            text: string;
                            size: string;
                        }[];
                    } | {
                        type: string;
                        layout: string;
                        contents: {
                            type: string;
                            text: string;
                            offsetTop: string;
                            align: string;
                            weight: string;
                            size: string;
                            color: string;
                        }[];
                    })[];
                    margin?: undefined;
                    offsetTop?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    margin: string;
                    layout?: undefined;
                    contents?: undefined;
                    offsetTop?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: ({
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            align?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            flex?: undefined;
                        })[];
                        margin?: undefined;
                    } | {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            align?: undefined;
                            offsetTop?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            offsetTop: string;
                            flex?: undefined;
                        })[];
                        margin?: undefined;
                    } | {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            align?: undefined;
                            offsetTop?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            offsetTop: string;
                            flex?: undefined;
                        })[];
                        margin: string;
                    })[];
                    offsetTop: string;
                    margin?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: {
                        type: string;
                        layout: string;
                        contents: ({
                            type: string;
                            text: string;
                            flex: number;
                            size: string;
                            align?: undefined;
                            color?: undefined;
                            weight?: undefined;
                            offsetTop?: undefined;
                        } | {
                            type: string;
                            text: string;
                            align: string;
                            size: string;
                            color: string;
                            weight: string;
                            offsetTop: string;
                            flex?: undefined;
                        })[];
                    }[];
                    margin: string;
                    offsetTop?: undefined;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: {
                        type: string;
                        action: {
                            type: string;
                            label: string;
                            uri: string;
                        };
                        height: string;
                        style: string;
                    }[];
                    offsetTop: string;
                    margin: string;
                    spacing?: undefined;
                    action?: undefined;
                    justifyContent?: undefined;
                    alignItems?: undefined;
                } | {
                    type: string;
                    layout: string;
                    contents: ({
                        type: string;
                        url: string;
                        flex: number;
                        gravity: string;
                        size: string;
                        animated: boolean;
                        text?: undefined;
                        color?: undefined;
                        weight?: undefined;
                        wrap?: undefined;
                        offsetStart?: undefined;
                    } | {
                        type: string;
                        text: string;
                        flex: number;
                        size: string;
                        color: string;
                        weight: string;
                        gravity: string;
                        wrap: boolean;
                        offsetStart: string;
                        url?: undefined;
                        animated?: undefined;
                    } | {
                        type: string;
                        url: string;
                        flex: number;
                        gravity: string;
                        size: string;
                        animated?: undefined;
                        text?: undefined;
                        color?: undefined;
                        weight?: undefined;
                        wrap?: undefined;
                        offsetStart?: undefined;
                    })[];
                    spacing: string;
                    action: {
                        type: string;
                        label: string;
                        text: string;
                    };
                    justifyContent: string;
                    alignItems: string;
                    offsetTop: string;
                    margin?: undefined;
                })[];
                paddingAll: string;
            };
        };
    }[];
};
//# sourceMappingURL=line.d.ts.map