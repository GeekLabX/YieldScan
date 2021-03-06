import React from "react";
import { WsProvider, ApiPromise } from "@polkadot/api";
import { web3FromAddress, web3Enable } from "@polkadot/extension-dapp";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";
import { useToast, CircularProgress, Text } from "@chakra-ui/core";
import { useHistory } from "react-router-dom";
import CustomButton from "../CustomButton";

const createAPI = async () => {
	const wsProvider = new WsProvider("wss://kusama-rpc.polkadot.io/");
	const api = await ApiPromise.create({ provider: wsProvider });
	return api;
};

const Testing = props => {
	const history = useHistory();
	const toast = useToast();
	const { handleTxStatus, handleTxBlock, handleIsSubmitted } = props;
	const isSubmitting = false;
	// Variables to change
	const STASH_ID = props.stashId;
	const CONTROLLER_ID = props.controllerId;
	const DECODED_CONTROLLER = props.controllerId
		? decodeAddress(CONTROLLER_ID)
		: "";
	const KUSAMA_CONTROLLER = props.controllerId
		? encodeAddress(DECODED_CONTROLLER, 2)
		: "";
	const VALIDATOR_LIST = props.validatorList;
	console.log(VALIDATOR_LIST);
	const STAKE_AMOUNT = props.stakeAmount;
	const AMOUNT = STAKE_AMOUNT * 10 ** 12;
	const submitTransaction = async () => {
		handleIsSubmitted(true);
		toast({
			title: "Retrieving Injector",
			description: "Retrieving injector from your selected controller",
			status: "info",
			duration: 9000,
			isClosable: true
		});
		const api = await createAPI();
		// const myinjectedAddress = await web3Accounts();`
		const injector = await web3FromAddress(CONTROLLER_ID);
		console.log("injector:");
		console.log(injector);
		api.setSigner(injector.signer);
		toast({
			title: "Checking existing bonds",
			description:
				"Checking to see if you've already bonded using the select stash account",
			status: "info",
			duration: 9000,
			isClosable: true
		});
		const ledger = await api.query.staking.ledger(STASH_ID);
		// Get controller nonce to batch transactions without failing
		const { nonce } = await api.query.system.account(KUSAMA_CONTROLLER);
		console.log(`CONTROLLER NONCE: ${JSON.stringify(nonce, null, 4)}`);
		console.log(ledger);
		toast({
			title: "Creating transactions",
			description: "Generating bonding and nomination transactions",
			status: "info",
			duration: 9000,
			isClosable: true
		});
		const txs = [
			!ledger
				? api.tx.staking.bond(STASH_ID, AMOUNT, 0)
				: api.tx.staking.bondExtra(AMOUNT),
			VALIDATOR_LIST && api.tx.staking.nominate(VALIDATOR_LIST)
		];
		console.log(txs);
		// txs[0].signAndSend(CONTROLLER_ID, ({ status }) => {
		// 	if (status.isInBlock) {
		// 		console.log(`bonded in ${status.asInBlock}`);
		// 	}
		// });
		// txs[1].signAndSend(
		// 	CONTROLLER_ID,
		// 	{ nonce: parseInt(nonce, 10) + 1 },
		// 	({ status }) => {
		// 		if (status.isInBlock) {
		// 			console.log(`nominated in ${status.asInBlock}`);
		// 		}
		// 	}
		// );
		api.tx.utility
			.batch(txs)
			.signAndSend(
				CONTROLLER_ID,
				{ nonce: parseInt(nonce, 10) },
				({ events = [], status }) => {
					console.log(`status: ${JSON.stringify(status, null, 4)}`);
					handleTxStatus(status);
					if (status.isInBlock) {
						console.log(`batched included in ${status.asInBlock}`);
					}
					if (status.isFinalized) {
						console.log(`finalized: ${status.asFinalized}`);
						api.rpc.chain.getBlock(`${status.asFinalized}`, ({ block }) => {
							console.log(`block: ${block.header.number}`);
							handleTxBlock(block);
						});
						toast({
							title: "Status",
							description: `Transaction included at blockHash ${status.asFinalized}`,
							status: "info",
							duration: 15000,
							isClosable: true
						});
						events.forEach(({ phase, event: { data, method, section } }) => {
							console.log(`${phase}: ${section}.${method}:: ${data}`);
							toast({
								title: `${phase}`,
								description: `${section}.${method}:: ${data}`,
								status: "warning",
								duration: 15000,
								isClosable: true
							});
						});
					}
					history.push("/status");
				}
			)
			.then(
				val => {
					console.log(val);
				},
				err => {
					toast({
						title: "Submission failed",
						description: "This could be due to failure of authorization",
						status: "error",
						duration: 15000,
						isClosable: true
					});
					console.log(err)
				}
			);
		// console.log(injected);
	};
	return (
		<CustomButton
			onClick={submitTransaction}
			disable={props.disable || isSubmitting}
		>
			{isSubmitting ? (
				<React.Fragment>
					<Text as='span' mr={4} verticalAlign='top'>
						Submitting
					</Text>
					<CircularProgress
						isIndeterminate
						as='span'
						color='white'
						size='24px'
						alignSelf='center'
					/>
				</React.Fragment>
			) : (
				"Submit"
			)}
		</CustomButton>
	);
};
export default Testing;
