import { FC, useEffect, useState } from "react";

import { Flex, Heading, Input, Text } from "@chakra-ui/react";

import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from "../common";
import { ModalProps } from "../common/Modal";
import Button from "../Button";
import { addLiquidity, approveSpending, getReserves, getTokenInfo, hasEnoughAllowance } from "@/services/contract";
import { useSorobanReact } from "@soroban-react/core";
import useWallets from "@/hooks/useWallets";
import { accountToScVal } from "@/utils";
import { nativeToScVal } from "@stellar/stellar-sdk";

interface Token {
    address: string;
    symbol: string;
    decimal: number;
}

const LiquidityModal: FC<ModalProps> = (props) => {
    const wallets = useWallets();

    const sorobanContext = useSorobanReact();
    const [reserves, setReserves] = useState<string>("");

    const [tokenA, setTokenA] = useState<Token>({
        address: "",
        symbol: "",
        decimal: 0,
    });
    const [tokenB, setTokenB] = useState<Token>({
        address: "",
        symbol: "",
        decimal: 0,
    });
    const [addrTokenA, setAddrTokenA] = useState<string>("");
    const [addrTokenB, setAddrTokenB] = useState<string>("");
    const [amtTokenA, setAmtTokenA] = useState<string>("");
    const [amtTokenB, setAmtTokenB] = useState<string>("");
    const [slippage, setSlippage] = useState<string>("");

    useEffect(() => {
        const fetchTokenA = async () => {
            const { address } = sorobanContext;
            if (!address) {
                console.log("Please connect your wallet");
                return;
            }
            const tknA = await getTokenInfo(sorobanContext, addrTokenA, address);
            console.log("tokenA", tknA);
            setTokenA(tknA);
        };
        fetchTokenA();
    }, [addrTokenA]);
    useEffect(() => {
        const fetchTokenB = async () => {
            const { address } = sorobanContext;
            if (!address) {
                console.log("Please connect your wallet");
                return;
            }
            const tknB = await getTokenInfo(sorobanContext, addrTokenB, address);
            console.log("tokenB", tknB);
            setTokenB(tknB);
        };
        fetchTokenB();
    }, [addrTokenB]);

    useEffect(() => {
        const w = wallets.filter((w) => w.isConnected);
        console.log("wallets", w);
        
    }, [wallets]);


    const getReservesCbk = async () => {
        const rsvz = await getReserves(sorobanContext);
        console.log("reserves", rsvz);
        setReserves(`A: ${rsvz[0]} B: ${rsvz[1]}`);
    }

    const addLiquidityCbk = async () => {
            if(amtTokenA === "" || amtTokenB === "" || slippage === "") {
                console.log("Please fill all fields");
                return;
            }
            if (tokenA.address === tokenB.address) {
                console.log("Token A and Token B cannot be the same");
                return;
            }
            if (parseFloat(amtTokenA) <= 0 || parseFloat(amtTokenB) <= 0) {
                console.log("Amount must be greater than 0");
                return;
            }
            if (parseFloat(slippage) < 0 || parseFloat(slippage) > 100) {
                console.log("Slippage must be between 0 and 100");
                return;
            }
            const { address } = sorobanContext;
            if (!address) {
                console.log("Please connect your wallet");
                return;
            }

            try {
                const minA = (parseFloat(amtTokenA) - parseFloat(slippage) * parseFloat(amtTokenA) / 100);
                const minB = (parseFloat(amtTokenB) - parseFloat(slippage) * parseFloat(amtTokenB) / 100);
                const min_a = BigInt(minA * 10 ** tokenA.decimal);
                const min_b = BigInt(minB * 10 ** tokenB.decimal);
                const desired_a = BigInt(parseFloat(amtTokenA) * 10 ** tokenA.decimal);
                const desired_b = BigInt(parseFloat(amtTokenB) * 10 ** tokenB.decimal);
                
                console.log("desired_a", desired_a);
                console.log("min_a", min_a);
                console.log("desired_b", desired_b);
                console.log("min_b", min_b);
                console.log("address", address);

                if(!await hasEnoughAllowance(sorobanContext, addrTokenA, address, desired_a)) {
                    console.log("Need of approval for spending tokenA")
                    await approveSpending(sorobanContext, addrTokenA, address, desired_a, 1000);
                }
                
                if(!await hasEnoughAllowance(sorobanContext, addrTokenB, address, desired_b)) {
                    console.log("Need of approval for spending tokenB")
                    await approveSpending(sorobanContext, addrTokenB, address, desired_b, 1000);
                }

                
    
                const addLiq = [
                    accountToScVal(address),
                    nativeToScVal(desired_a),
                    nativeToScVal(min_a),
                    nativeToScVal(desired_b),
                    nativeToScVal(min_b),
                ];
    
                const respose = await addLiquidity(sorobanContext, addLiq);
                console.log("addLiquidity response", respose);
            } catch(e) {
                console.error("Web3 Error: ", e);
            }
    }
    return (
        <Modal {...props}>
            <ModalOverlay />
            <ModalContent left={{ base: '50%', lg: '75%' }} p={8} w='full' maxW={{ base: '320px', lg: '420px' }} direction='column' gap={4}>
                <ModalCloseButton />
                <Heading as="h2" textAlign="center" size="lg">
                    LIQUIDITY
                </Heading>
                <Button onClick={_ => getReservesCbk()} colorScheme='blue' w='full'>
                Reserves
                </Button>
                <Text textAlign='center'>
                    {reserves}
                </Text>
                <Text textAlign='center'>
                    Addresses
                </Text>
                <Flex direction='column' gap='4px'>
                    <Text fontSize='18px'>
                    Token A
                    </Text>
                    <Input onChange={e => setAddrTokenA(e.target.value)} />
                    <Text fontSize='18px'>
                    Token B
                    </Text>
                    <Input onChange={e => setAddrTokenB(e.target.value)} />
                </Flex>
                <Text textAlign='center'>
                    Amounts
                </Text>
                <Flex direction='column' gap='4px'>
                    <Text fontSize='18px'>
                    Token A
                    </Text>
                    <Input onChange={e => setAmtTokenA(e.target.value)} />
                    <Text fontSize='18px'>
                    Token B
                    </Text>
                    <Input onChange={e => setAmtTokenB(e.target.value)} />
                    <Text fontSize='18px'>
                    Slippage
                    </Text>
                    <Input onChange={e => setSlippage(e.target.value)} />
                </Flex>
                <Button onClick={_ => addLiquidityCbk()}>Add Liquidity</Button>
            </ModalContent>
        </Modal>
    )
}

export default LiquidityModal;
